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

// 1단계: 사진이 음식인지, 무슨 음식인지 식별
const IdentifySchema = z.object({
  isFood: z.boolean().describe("사진에 먹을 수 있는 음식이나 음료가 있으면 true"),
  whatIsIt: z.string().describe("음식이 아니면 사진에 보이는 것을 한 문장으로. 음식이면 메뉴 이름"),
  foods: z.array(z.string()).describe("식별한 음식과 음료 이름. 조리 상태를 포함. 예: 연어회, 자몽에이드, 익힌 돈가스"),
});

// 2단계: 환자 상태와 지침에 비추어 판단
const AdviseSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      verdict: z.enum(["가능", "조건부", "피하기"]),
      reason: z.string().describe("이 환자의 면역 상태와 지침을 연결한 이유 한 문장"),
      rule: z.string().describe("근거가 된 지침 문구를 짧게. 출처가 있으면 함께"),
    })
  ),
  overall: z.enum(["가능", "조건부", "피하기"]),
  recommendation: z.string().describe("환자용 권고 2문장에서 4문장. 조건부면 어떻게 하면 되는지, 피하기면 대신 무엇을 먹을지"),
  immuneContext: z.string().describe("판단 근거가 된 환자 상태 한 문장. 이식 경과일, ANC, 면역억제제, GVHD"),
});

type ImgContent = ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

// 진행 상황을 NDJSON으로 흘려보낸다. status 이벤트가 단계, done 이벤트가 결과다.
export async function POST(req: Request) {
  const { patientId, image, description } = (await req.json()) as { patientId: string; image?: string; description?: string };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  if (!image && !description) return NextResponse.json({ error: "사진이나 설명이 필요합니다" }, { status: 400 });
  const hasImage = !!image?.startsWith("data:image/");

  return ndjsonResponse(async (send) => {
    // 1단계
    let identified: z.infer<typeof IdentifySchema>;
    if (hasImage) {
      send({ type: "status", label: "사진 속 음식 알아보기", hints: ["사진을 살펴보는 중", "음식인지 확인하는 중", "메뉴와 조리 상태를 구분하는 중"] });
      const idLlm = makeLLM({ effort: "low" }).withStructuredOutput(IdentifySchema, { method: "jsonSchema" });
      const content: ImgContent = [
        { type: "text", text: `사진에 무엇이 있는지 식별한다. 음식이나 음료가 아니면 isFood를 false로 한다. 음식이면 각 음식을 조리 상태까지 구분해 이름을 적는다.${description ? ` 환자 설명: ${description}` : ""}\n${STYLE_RULES}` },
        { type: "image_url", image_url: { url: image! } },
      ];
      identified = tidyDeep(await idLlm.invoke([new HumanMessage({ content })]));
    } else {
      identified = { isFood: true, whatIsIt: description!, foods: [description!] };
    }

    if (!identified.isFood) {
      send({ type: "done", isFood: false, whatIsIt: identified.whatIsIt, message: "음식 사진이 아닌 것 같습니다. 드시려는 음식이 잘 보이게 다시 찍어 올려주세요." });
      return;
    }

    // 2단계
    send({ type: "status", label: "식이 지침 검색", hints: ["본원 식이 지침을 찾는 중", "저균식 허용 식품 목록을 확인하는 중", "환자 기록을 불러오는 중"] });
    const query = `이식 후 식이 지침 저균식 허용 식품 주의 식품 ${identified.foods.join(" ")}`;
    const hits = await retrieve(query, { patientId, k: 6, kinds: ["guideline", "external", "lab", "profile", "medication"] });

    send({ type: "status", label: "면역 상태와 비교해 판단", hints: ["이식 경과일과 ANC를 확인하는 중", "면역억제제와 음식 상호작용을 확인하는 중", "음식별로 가능 여부를 정하는 중", "권고 문장을 정리하는 중"] });
    const llm = makeLLM({ effort: "low" }).withStructuredOutput(AdviseSchema, { method: "jsonSchema" });
    const sys = `당신은 조혈모세포이식 센터의 영양 상담 전문간호사다. 식별된 음식 목록을 이 환자의 현재 면역 상태와 본원 식이 지침에 비추어 하나씩 판단한다.
판단 요소: 이식 후 경과일, ANC, 면역억제제 복용 여부, GVHD와 설사 유무, 자몽처럼 약물 상호작용이 있는 식품, 조리 상태와 세척 가능 여부.
각 음식의 rule에는 어떤 지침 문구에 근거했는지 적는다. 지침에 없는 음식은 가장 가까운 분류로 판단하되 그렇게 판단했다고 밝힌다.
환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}.
${STYLE_RULES}`;
    const user = `환자 기록:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map(formatHit).join("\n\n")}\n\n식별된 음식: ${identified.foods.join(", ")}\n메뉴: ${identified.whatIsIt}${description ? `\n환자 설명: ${description}` : ""}`;
    const res = tidyDeep(await llm.invoke([new SystemMessage(sys), new HumanMessage(user)]));
    send({
      type: "done",
      isFood: true,
      whatIsIt: identified.whatIsIt,
      identified: identified.foods,
      ...res,
      guidelineTitles: hits.filter((h) => h.kind === "guideline" || h.kind === "external").map((h) => h.title),
    });
  });
}
