import { NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { makeLLM, STYLE_RULES } from "@/lib/llm";
import { tidyDeep } from "@/lib/style";
import { retrieve, patientContext, formatHit } from "@/lib/rag";
import { ndjsonResponse } from "@/lib/ndjson";
import { getPatient, daysSince } from "@/data/patients";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  findings: z.array(z.string()).describe("사진에서 관찰한 소견. 분포, 색, 융기, 물집, 경계"),
  likely: z.array(z.object({ name: z.string(), likelihood: z.enum(["높음", "중간", "낮음"]), why: z.string() })).max(3),
  bsaEstimate: z.string().describe("체표면적 추정 또는 추정 불가"),
  level: z.enum(["red", "yellow", "green"]),
  patientMessage: z.string().describe("환자용 안내 3문장에서 5문장. 첫 문장은 등급 문구"),
  careTips: z.array(z.string()).max(4),
  staffNote: z.string().describe("의료진용 한 단락"),
  alertTitle: z.string(),
});

// 진행 상황을 NDJSON으로 흘려보낸다. status 이벤트가 단계, done 이벤트가 결과다.
export async function POST(req: Request) {
  const { patientId, image, description } = (await req.json()) as { patientId: string; image: string; description?: string };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  if (!image?.startsWith("data:image/")) return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 });

  return ndjsonResponse(async (send) => {
    send({ type: "status", label: "환자 기록과 피부 지침 검색", hints: ["이식 경과와 최근 검사를 불러오는 중", "피부 GVHD와 감염 지침을 찾는 중"] });
    const hits = await retrieve(`피부 병변 발진 GVHD 감별 ${description ?? ""}`, { patientId, k: 5, kinds: ["guideline", "visit", "lab"] });

    send({ type: "status", label: "사진 살펴보고 등급 판단", hints: ["사진을 살펴보는 중", "분포와 색, 물집 여부를 확인하는 중", "이식 경과와 검사 결과를 대조하는 중", "가능성을 정리하는 중", "등급과 안내문을 정하는 중"] });
    const llm = makeLLM({ effort: "medium" }).withStructuredOutput(Schema, { method: "jsonSchema" });
    const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 환자가 보낸 피부 사진과 설명, 환자의 이식 경과와 검사 기록을 보고 병변을 평가한다.
등급: red는 응급실, 예를 들어 광범위 물집이나 피부 벗겨짐, 대상포진 의심에 발열 동반, 급속 확산하는 봉와직염. yellow는 의료진 전화 확인, 예를 들어 GVHD 의심 발진의 신규 발생이나 확산, 대상포진 의심, 카테터 부위 발적. green은 자가관리, 예를 들어 건조, 경미한 접촉성 자극, 변화 없는 기존 병변.
환자 안내문 첫 문장은 등급에 맞게 "응급실을 방문해주세요", "의료진에게 전화로 확인해주세요", "지금처럼 자가관리 잘해주세요" 중 하나로 시작한다.
사진만으로 확진할 수 없음을 전제로 하되 환자가 다음에 무엇을 해야 하는지 분명하게 쓴다.
환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}.
${STYLE_RULES}`;
    const text = `환자 기록:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map(formatHit).join("\n\n")}\n\n환자 설명: ${description || "설명 없음"}`;
    const res = await llm.invoke([
      new SystemMessage(sys),
      new HumanMessage({ content: [{ type: "text", text }, { type: "image_url", image_url: { url: image } }] }),
    ]);
    send({ type: "done", ...tidyDeep(res) });
  });
}
