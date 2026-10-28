import { NextResponse } from "next/server";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { makeLLM, STYLE_RULES } from "@/lib/llm";
import { tidy, tidyDeep } from "@/lib/style";
import { retrieve, patientContext, formatHit } from "@/lib/rag";
import { ndjsonResponse } from "@/lib/ndjson";
import { searchPubmed, type PubmedRef } from "@/lib/pubmed";
import { getPatient, daysSince, TODAY } from "@/data/patients";

export const runtime = "nodejs";
export const maxDuration = 120;

type Msg = { role: "user" | "assistant"; text: string };

// 1단계: 답하기 전에 문헌 검색이 필요한지만 빠르게 정한다.
const PlanSchema = z.object({
  needsLiterature: z.boolean().describe("본원 지침과 환자 기록만으로 답하기 어려워 PubMed 문헌 확인이 필요하면 true"),
  pubmedQuery: z.string().describe("needsLiterature가 true일 때 PubMed 영어 핵심어 3개에서 6개. 예: sauna infection immunocompromised. 아니면 빈 문자열"),
});

// 3단계: 완성된 답에서 근거, 에스컬레이션, 후속 질문, 인용 PMID를 뽑는다.
const MetaSchema = z.object({
  basis: z.array(z.string()).max(4).describe("답의 근거가 된 환자 상태나 지침. 지침이면 출처 저자와 연도를 함께. 짧게"),
  escalate: z.boolean().describe("의료진 확인이 필요한 질문이면 true"),
  followUps: z.array(z.string()).max(3).describe("환자가 이어서 물어볼 만한 질문"),
  citedPmids: z.array(z.string()).describe("답에 실제로 인용된 PMID만. 없으면 빈 배열"),
});

function chunkText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === "string" ? c : c && typeof c === "object" && "text" in c ? String((c as { text?: unknown }).text ?? "") : "")).join("");
  return "";
}

// 답변 본문은 토큰 단위로 흘려보내고, 앞뒤의 검색과 정리 단계는 status 이벤트로 알린다.
export async function POST(req: Request) {
  const { patientId, messages } = (await req.json()) as { patientId: string; messages: Msg[] };
  const p = getPatient(patientId);
  if (!p) return NextResponse.json({ error: "환자를 찾을 수 없습니다" }, { status: 404 });
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return NextResponse.json({ error: "질문이 없습니다" }, { status: 400 });

  return ndjsonResponse(async (send) => {
    send({ type: "status", label: "환자 기록과 본원 지침 확인", hints: ["환자 기록을 불러오는 중", "관련 지침을 찾는 중", "문헌 검색이 필요한지 보는 중"] });
    const hits = await retrieve(last.text, { patientId, k: 6 });
    const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 환자의 일상생활 질문에 환자의 현재 상태를 반영해 답한다. 운동, 복직, 여행, 예방접종, 건강검진, 피부와 모발 관리, 성생활, 연고지 병원 이용, 보조식품, 식이 같은 주제다.
일반론이 아니라 이 환자의 이식 경과일, 면역억제제, 혈소판과 호중구, GVHD 상태에 맞춘 답을 한다.
의료진 판단이 필요한 사안이면 답에서 그렇게 안내한다.
오늘은 ${TODAY}. 환자는 ${p.name}, 이식후 D+${daysSince(p.transplantDate)}, 다음 외래 ${p.nextVisit}.
${STYLE_RULES}`;
    const history = messages.slice(0, -1).slice(-8).map((m) => (m.role === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)));
    const ctx = `환자 기록:\n${patientContext(patientId)}\n\n관련 지침:\n${hits.map(formatHit).join("\n\n")}`;

    const plan = await makeLLM({ effort: "low", maxTokens: 300 })
      .withStructuredOutput(PlanSchema, { method: "jsonSchema" })
      .invoke([new SystemMessage(sys + "\n\n" + ctx + "\n\n지금은 답을 쓰지 말고 문헌 검색이 필요한지만 판단한다. 본원 지침이나 환자 기록에 답의 근거가 있으면 false."), ...history, new HumanMessage(last.text)]);

    let references: PubmedRef[] = [];
    let litBlock = "";
    if (plan.needsLiterature && plan.pubmedQuery) {
      send({ type: "status", label: "PubMed 문헌 검색", hints: [`PubMed에서 ${plan.pubmedQuery} 검색 중`, "초록을 읽는 중", "환자 상황과 맞는지 보는 중"] });
      references = await searchPubmed(plan.pubmedQuery, 4);
      if (references.length > 0) {
        const lit = references.map((r) => `PMID ${r.pmid}. ${r.title}. ${r.journal} ${r.year}. ${r.abstract}`).join("\n\n");
        litBlock = `\n\nPubMed에서 찾은 문헌:\n${lit}\n\n문헌에 쓰인 내용만 인용하고, 문헌이 환자 상황과 맞지 않으면 그렇게 말한다. 문헌을 인용할 때는 문장 끝에 PMID 번호를 쓴다.`;
      }
    }

    send({ type: "status", label: "답변 작성", hints: ["답을 쓰는 중"] });
    const answerLlm = makeLLM({ effort: litBlock ? "medium" : "low", maxTokens: 1200 });
    const answerSys = sys + "\n\n" + ctx + litBlock + "\n\n환자에게 보내는 답만 3문장에서 6문장으로 쓴다. 제목이나 머리말 없이 바로 본문을 쓴다.";
    let answer = "";
    const stream = await answerLlm.stream([new SystemMessage(answerSys), ...history, new HumanMessage(last.text)]);
    for await (const chunk of stream) {
      const t = chunkText(chunk.content);
      if (!t) continue;
      answer += t;
      send({ type: "token", text: t });
    }
    answer = tidy(answer);

    send({ type: "status", label: "근거 정리", hints: ["근거와 이어질 질문을 정리하는 중"] });
    const meta = tidyDeep(
      await makeLLM({ effort: "low", maxTokens: 600 })
        .withStructuredOutput(MetaSchema, { method: "jsonSchema" })
        .invoke([
          new SystemMessage(sys + "\n\n" + ctx + litBlock + "\n\n아래 질문과 이미 작성된 답을 보고 근거, 의료진 확인 필요 여부, 후속 질문, 인용된 PMID를 정리한다."),
          ...history,
          new HumanMessage(last.text),
          new AIMessage(answer),
          new HumanMessage("위 답의 basis, escalate, followUps, citedPmids를 정리해라."),
        ])
    );
    const cited = new Set(meta.citedPmids);
    send({
      type: "done",
      answer,
      basis: meta.basis,
      escalate: meta.escalate,
      followUps: meta.followUps,
      references: references.filter((r) => cited.has(r.pmid)).map(({ pmid, title, journal, year, url }) => ({ pmid, title, journal, year, url })),
      searched: plan.needsLiterature ? plan.pubmedQuery : "",
    });
  });
}
