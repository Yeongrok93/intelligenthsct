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
  foods: z.array(
    z.object({
      name: z.string(),
      verdict: z.enum(["가능", "조건부", "피하기"]),
      reason: z.string().describe("이 환자의 면역 상태와 연결한 이유 한 문장"),
    })
  ),
  overall: z.enum(["가능", "조건부", "피하기"]),
  patientMessage: z.string().describe("환자용 안내 2문장에서 4문장"),
  immuneContext: z.string().describe("판단 근거가 된 환자 상태 한 문장. 이식 경과일, ANC, 면역억제제, GVHD"),
});

export async function POST(req: Request) {
  const { patientId, image, description } = (await req.json()) as { patientId: string; image?: string; description?: string };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  if (!image && !description) return NextResponse.json({ error: "사진이나 설명이 필요합니다" }, { status: 400 });

  const hits = await retrieve(`이식 후 식이 지침 저균식 ${description ?? ""}`, { patientId, k: 4, kinds: ["guideline", "lab", "profile"] });
  const llm = makeLLM({ effort: "low" }).withStructuredOutput(Schema, { method: "jsonSchema" });
  const sys = `당신은 조혈모세포이식 센터의 영양 상담 전문간호사다. 환자가 보낸 음식 사진이나 설명을 보고 이 환자의 현재 면역 상태에 맞춰 섭취 가능 여부를 판단한다.
판단 요소: 이식 후 경과일, ANC, 면역억제제 복용 여부, GVHD와 설사 유무, 자몽처럼 약물 상호작용이 있는 식품.
음식을 하나씩 식별해 각각 판단하고, 조건부는 어떻게 하면 먹을 수 있는지 쓴다.
환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}.
${STYLE_RULES}`;
  const text = `환자 기록:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map((h) => h.text).join("\n\n")}\n\n환자 설명: ${description || "설명 없음"}`;
  const content: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] = [{ type: "text", text }];
  if (image?.startsWith("data:image/")) content.push({ type: "image_url", image_url: { url: image } });
  const res = await llm.invoke([new SystemMessage(sys), new HumanMessage({ content })]);
  return NextResponse.json(tidyDeep(res));
}
