import { NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { makeLLM, STYLE_RULES } from "@/lib/llm";
import { tidyDeep } from "@/lib/style";
import { retrieve, patientContext } from "@/lib/rag";
import { getPatient, daysSince } from "@/data/patients";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  mode: z.enum(["처방약", "검진결과"]),
  items: z.array(
    z.object({
      name: z.string().describe("타원 약 이름 또는 검진 항목"),
      concern: z.enum(["주의", "확인", "문제없음"]),
      interactsWith: z.string().describe("상호작용하는 본원 약. 없으면 없음"),
      detail: z.string().describe("무엇이 문제이고 어떻게 해야 하는지 한두 문장"),
    })
  ),
  level: z.enum(["red", "yellow", "green"]),
  patientMessage: z.string().describe("환자용 안내 2문장에서 4문장"),
  staffNote: z.string().describe("의료진 전달용 한 단락. 없으면 빈 문자열"),
});

export async function POST(req: Request) {
  const { patientId, input, image } = (await req.json()) as { patientId: string; input?: string; image?: string };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  if (!input && !image) return NextResponse.json({ error: "입력이 없습니다" }, { status: 400 });

  const hits = await retrieve(`약물 상호작용 면역억제제 타원 처방 ${input ?? ""}`, { patientId, k: 5, kinds: ["guideline", "medication", "lab"] });
  const llm = makeLLM({ effort: "medium" }).withStructuredOutput(Schema, { method: "jsonSchema" });
  const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 환자가 다른 병원에서 받은 처방약 목록이나 건강검진, 진료 결과를 입력하면 본원 처방약과의 상호작용과 주의점을 확인한다.
처방약이면 각 약을 본원 복용약과 대조해 면역억제제 농도 변화, 신독성, 출혈, 고칼륨, 생백신 여부를 확인한다.
검진 결과면 각 항목이 이 환자의 이식 후 상태에서 어떤 의미인지 설명하고 본원에 알려야 할 것을 짚는다.
등급: red는 복용 중단 후 즉시 연락이 필요한 조합. yellow는 복용 전 의료진 확인 필요. green은 그대로 복용 가능.
환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}.
${STYLE_RULES}`;
  const text = `환자 기록과 본원 복용약:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map((h) => h.text).join("\n\n")}\n\n환자 입력:\n${input || "사진 참조"}`;
  const content: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] = [{ type: "text", text }];
  if (image?.startsWith("data:image/")) content.push({ type: "image_url", image_url: { url: image } });
  const res = await llm.invoke([new SystemMessage(sys), new HumanMessage({ content })]);
  return NextResponse.json(tidyDeep(res));
}
