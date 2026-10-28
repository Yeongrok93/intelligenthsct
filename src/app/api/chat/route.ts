import { NextResponse } from "next/server";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { makeLLM, STYLE_RULES } from "@/lib/llm";
import { tidyDeep } from "@/lib/style";
import { retrieve, patientContext } from "@/lib/rag";
import { searchPubmed, type PubmedRef } from "@/lib/pubmed";
import { getPatient, daysSince, TODAY } from "@/data/patients";

export const runtime = "nodejs";
export const maxDuration = 120;

type Msg = { role: "user" | "assistant"; text: string };

const Schema = z.object({
  answer: z.string().describe("환자에게 보내는 답. 3문장에서 6문장"),
  basis: z.array(z.string()).max(3).describe("답의 근거가 된 환자 상태나 지침. 짧게"),
  escalate: z.boolean().describe("의료진 확인이 필요한 질문이면 true"),
  followUps: z.array(z.string()).max(3).describe("환자가 이어서 물어볼 만한 질문"),
  needsLiterature: z.boolean().describe("본원 지침만으로 답하기 어려워 PubMed 문헌 확인이 필요하면 true"),
  pubmedQuery: z.string().describe("needsLiterature가 true일 때 PubMed 영어 핵심어 3개에서 6개. 예: sauna infection immunocompromised. 아니면 빈 문자열"),
});

const FinalSchema = z.object({
  answer: z.string().describe("문헌을 반영한 최종 답. 3문장에서 6문장. 문헌을 인용할 때는 문장 끝에 PMID 번호를 쓴다"),
  basis: z.array(z.string()).max(4),
  escalate: z.boolean(),
  followUps: z.array(z.string()).max(3),
  citedPmids: z.array(z.string()).describe("실제로 답에 반영한 PMID만"),
});

export async function POST(req: Request) {
  const { patientId, messages } = (await req.json()) as { patientId: string; messages: Msg[] };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return NextResponse.json({ error: "질문이 없습니다" }, { status: 400 });

  const hits = await retrieve(last.text, { patientId, k: 6 });
  const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 환자의 일상생활 질문에 환자의 현재 상태를 반영해 답한다. 운동, 복직, 여행, 예방접종, 건강검진, 피부와 모발 관리, 성생활, 연고지 병원 이용, 보조식품, 식이 같은 주제다.
일반론이 아니라 이 환자의 이식 경과일, 면역억제제, 혈소판과 호중구, GVHD 상태에 맞춘 답을 한다.
의료진 판단이 필요한 사안이면 escalate를 true로 하고 답에서도 그렇게 안내한다.
본원 지침과 환자 기록에 근거가 없는 질문이면 needsLiterature를 true로 하고 영어 PubMed 검색어를 쓴다. 지침에 답이 있으면 false.
오늘은 ${TODAY}. 환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}, 다음 외래 ${p.nextVisit}.
${STYLE_RULES}`;
  const history = messages.slice(0, -1).slice(-8).map((m) => (m.role === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)));
  const ctx = `환자 기록:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map((h) => `[${h.title}] ${h.text}`).join("\n\n")}`;

  const first = tidyDeep(
    await makeLLM({ effort: "low" })
      .withStructuredOutput(Schema, { method: "jsonSchema" })
      .invoke([new SystemMessage(sys + "\n\n" + ctx), ...history, new HumanMessage(last.text)])
  );

  let references: PubmedRef[] = [];
  if (first.needsLiterature && first.pubmedQuery) {
    references = await searchPubmed(first.pubmedQuery, 4);
    if (references.length > 0) {
      const lit = references.map((r) => `PMID ${r.pmid}. ${r.title}. ${r.journal} ${r.year}. ${r.abstract}`).join("\n\n");
      const second = tidyDeep(
        await makeLLM({ effort: "medium" })
          .withStructuredOutput(FinalSchema, { method: "jsonSchema" })
          .invoke([
            new SystemMessage(sys + "\n\n" + ctx + `\n\nPubMed에서 찾은 문헌:\n${lit}\n\n문헌에 쓰인 내용만 인용하고, 문헌이 환자 상황과 맞지 않으면 그렇게 말한다.`),
            ...history,
            new HumanMessage(last.text),
          ])
      );
      const cited = new Set(second.citedPmids);
      return NextResponse.json({
        answer: second.answer,
        basis: second.basis,
        escalate: second.escalate,
        followUps: second.followUps,
        references: references.filter((r) => cited.has(r.pmid)).map(({ pmid, title, journal, year, url }) => ({ pmid, title, journal, year, url })),
        searched: first.pubmedQuery,
      });
    }
  }

  return NextResponse.json({ answer: first.answer, basis: first.basis, escalate: first.escalate, followUps: first.followUps, references: [], searched: first.needsLiterature ? first.pubmedQuery : "" });
}
