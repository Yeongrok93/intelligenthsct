// LangGraph 기반 증상 분류 파이프라인.
// 증상 추출 -> 추가 질문 판단 -> 검사 데이터 검색 -> 위험도 평가 -> 안내문 생성 -> 의료진 알림
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { makeLLM, STYLE_RULES } from "@/lib/llm";
import { tidyDeep } from "@/lib/style";
import { retrieve, patientContext, graphExplain, docsById, formatHit, type RagHit } from "@/lib/rag";
import { getPatient, daysSince, TODAY, type RiskLevel } from "@/data/patients";

export type Turn = { role: "patient" | "assistant"; text: string };

const SymptomSchema = z.object({
  chiefComplaint: z.string().describe("주 호소를 한 문장으로"),
  location: z.string().describe("부위. 불명확하면 불명확이라고 쓴다"),
  character: z.string().describe("증상의 성질"),
  onset: z.string().describe("시작 시점과 경과. 모르면 불명확이라고 쓴다"),
  severity: z.number().min(0).max(10).describe("0에서 10 추정 강도"),
  trend: z.enum(["악화", "유지", "호전", "불명확"]),
  fever: z.enum(["있음", "없음", "불명확"]),
  associated: z.array(z.string()).describe("동반 증상"),
  redFlags: z.array(z.string()).describe("응급 기준에 해당할 수 있는 요소"),
  concepts: z.array(z.string()).max(6).describe("환자가 실제로 있다고 말한 증상과 상황을 짧은 명사구로. 없다고 한 것은 제외. 예: 귀 주변 불편감, 발진 확대, 설사 증가, 스테로이드 감량 중"),
  followUpQuestions: z.array(z.string()).max(2).describe("위험도 판단에 꼭 필요한데 빠진 정보를 묻는 질문. 충분하면 빈 배열"),
});
export type Symptoms = z.infer<typeof SymptomSchema>;

const AssessmentSchema = z.object({
  level: z.enum(["red", "yellow", "green"]),
  headline: z.string().describe("판단 요지 한 문장"),
  axes: z.array(
    z.object({
      name: z.enum(["감염", "GVHD", "PTLD", "기타"]),
      risk: z.enum(["높음", "중간", "낮음"]),
      evidence: z.array(z.string()).describe("증상과 검사 수치를 결합한 근거"),
    })
  ),
  labSignals: z.array(z.string()).describe("판단에 영향을 준 검사 수치와 추세"),
  symptomOnlyLevel: z.enum(["red", "yellow", "green"]).describe("검사 데이터 없이 증상만으로 판단했을 때의 등급"),
  whyChanged: z.string().describe("증상만의 등급과 최종 등급이 다르면 그 이유, 같으면 동일이라고 쓴다"),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

const OutputSchema = z.object({
  patientMessage: z.string().describe("환자에게 보여줄 안내. 3문장에서 5문장"),
  patientActions: z.array(z.string()).max(4).describe("환자가 지금 할 일"),
  sbar: z.object({
    situation: z.string(),
    background: z.string(),
    assessment: z.string(),
    recommendation: z.string(),
  }),
  alertTitle: z.string().describe("의료진 알림 제목 20자 이내"),
});
export type Outputs = z.infer<typeof OutputSchema>;

export type TraceStep = { node: string; label: string; summary: string; at: number };

export type TriageAlert = {
  id: string;
  patientId: string;
  patientName: string;
  level: RiskLevel;
  title: string;
  createdAt: string;
  status: "new" | "acknowledged" | "done";
  chiefComplaint: string;
  sbar: Outputs["sbar"];
  assessment: Assessment;
  symptoms: Symptoms;
  transcript: Turn[];
  patientMessage: string;
  patientActions?: string[];
  kgPaths?: string[];
  contextTitles?: string[];
};

const TriageState = Annotation.Root({
  patientId: Annotation<string>,
  turns: Annotation<Turn[]>,
  symptoms: Annotation<Symptoms | null>({ reducer: (_, b) => b, default: () => null }),
  needMoreInfo: Annotation<boolean>({ reducer: (_, b) => b, default: () => false }),
  context: Annotation<RagHit[]>({ reducer: (_, b) => b, default: () => [] }),
  kgPaths: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  assessment: Annotation<Assessment | null>({ reducer: (_, b) => b, default: () => null }),
  outputs: Annotation<Outputs | null>({ reducer: (_, b) => b, default: () => null }),
  alert: Annotation<TriageAlert | null>({ reducer: (_, b) => b, default: () => null }),
  trace: Annotation<TraceStep[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});

import { LEVEL_LABEL } from "@/lib/levels";
export { LEVEL_LABEL };

function transcriptText(turns: Turn[]) {
  return turns.map((t) => `${t.role === "patient" ? "환자" : "앱"}: ${t.text}`).join("\n");
}

async function extractNode(state: typeof TriageState.State) {
  const p = getPatient(state.patientId);
  const patientTurns = state.turns.filter((t) => t.role === "patient").length;
  const llm = makeLLM({ effort: "low" }).withStructuredOutput(SymptomSchema, { method: "jsonSchema" });
  const sys = `당신은 동종조혈모세포이식 후 외래 환자의 증상을 정리하는 이식 전문간호사다. 환자의 구두 설명을 구조화한다.
환자는 ${p?.name}, 이식후 D+${p ? daysSince(p.transplantDate) : "?"}.
추가 질문 규칙: 위험도 판단에 꼭 필요한 정보가 빠졌을 때만 최대 2개. 환자가 이미 ${patientTurns}번 답했다. ${
    patientTurns >= 3 ? "더 묻지 말고 followUpQuestions는 빈 배열로 둔다." : "열 유무, 시작 시점, 악화 여부, 동반 증상 중 빠진 것을 우선 묻는다."
  }
질문은 환자가 말로 바로 답할 수 있게 짧고 구체적으로.
concepts는 지침에서 쓰는 일반 용어로 부위와 증상을 붙여 짧게 쓴다. 예: 귀 불편감, 두통, 발진 확대, 설사 증가, 전신 쇠약, 림프절 부종. 환자의 비유 표현을 그대로 옮기지 않는다.
${STYLE_RULES}`;
  const res = await llm.invoke([new SystemMessage(sys), new HumanMessage(`대화 기록:\n${transcriptText(state.turns)}`)]);
  const symptoms = tidyDeep(res);
  const needMoreInfo = patientTurns < 3 && symptoms.followUpQuestions.length > 0;
  return {
    symptoms,
    needMoreInfo,
    trace: [
      {
        node: "extract",
        label: "증상 추출",
        summary: `${symptoms.chiefComplaint}. 부위 ${symptoms.location}, 강도 ${symptoms.severity}/10, 경과 ${symptoms.trend}, 열 ${symptoms.fever}`,
        at: Date.now(),
      },
      needMoreInfo
        ? { node: "clarify", label: "추가 질문", summary: symptoms.followUpQuestions.join(" / "), at: Date.now() }
        : { node: "clarify", label: "추가 질문", summary: "정보 충분, 평가로 진행", at: Date.now() },
    ],
  };
}

async function retrieveNode(state: typeof TriageState.State) {
  const s = state.symptoms!;
  const query = `${s.chiefComplaint} ${s.location} ${s.character} ${s.associated.join(" ")} 열 ${s.fever} 이식 후 위험 평가`;
  // 구조화된 증상과 개념어만 쓴다. 원문에는 "물집은 없고" 같은 부정 표현이 섞여 있어 그래프 매칭에 소음이 된다
  const kgx = await graphExplain(query, [...s.concepts, ...(s.location && s.location !== "불명확" ? [`${s.location} 불편감`] : [])]);
  const [guide, records] = await Promise.all([
    retrieve(query, { patientId: state.patientId, k: 6, kinds: ["guideline", "external"], graph: kgx }),
    retrieve(query, { patientId: state.patientId, k: 5, kinds: ["lab", "visit", "profile", "medication"], graph: kgx }),
  ]);
  // 지식그래프 관계의 근거 문서는 검색 점수와 무관하게 포함한다
  const extra = docsById(kgx.evidenceDocs.filter((id) => !guide.some((h) => h.id === id)).slice(0, 3)).map((d) => ({ ...d, score: 0, via: ["지식그래프 근거"] }));
  const hits = [...records, ...guide, ...extra];
  const kgSummary =
    kgx.seeds.length > 0
      ? `지식그래프: ${kgx.seeds.map((n) => n.label).join(", ")}에서 ${kgx.related
          .slice(0, 6)
          .map((n) => n.label)
          .join(", ")}로 확장. `
      : "";
  return {
    context: hits,
    kgPaths: kgx.paths.slice(0, 6),
    trace: [
      {
        node: "retrieve",
        label: "검사 데이터 결합",
        summary: kgSummary + hits.map((h) => h.title).join(", "),
        at: Date.now(),
      },
    ],
  };
}

async function assessNode(state: typeof TriageState.State) {
  const p = getPatient(state.patientId)!;
  const llm = makeLLM({ effort: "medium" }).withStructuredOutput(AssessmentSchema, { method: "jsonSchema" });
  const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 환자의 증상과 본원이 보유한 최근 검사 데이터, 이식 후 경과, 관리 지침을 결합해 위험도를 분류한다.
등급 기준:
red는 응급실 즉시 방문. 응급 기준에 해당하거나 생명을 위협할 수 있는 상태.
yellow는 의료진에게 전화로 확인. 응급은 아니나 외래를 당기거나 약 조정, 추가 검사가 필요할 수 있는 상태. 모호한 증상이라도 검사 추세와 결합하면 의미가 있는 경우 포함.
green은 지금처럼 자가관리. 검사와 증상 모두 안심할 수 있고 다음 외래까지 기다려도 되는 상태.
근거 원칙: 각 근거에는 어떤 검사 수치나 지침에서 나온 것인지 밝힌다. 지침에 출처가 붙어 있으면 근거에 출처 저자와 연도를 짧게 쓴다.
핵심 원칙: 환자가 말로 표현하기 어려운 모호한 증상이라도 EBV나 CMV 추세, 간수치, 면역억제제 농도, 스테로이드 감량 중 여부 같은 맥락과 결합해 판단한다. 증상만 보면 놓칠 수 있는 위험을 검사 데이터로 잡아내는 것이 당신의 역할이다.
오늘은 ${TODAY}, 환자는 이식후 D+${daysSince(p.transplantDate)}.
${STYLE_RULES}`;
  const ctx = state.context.map(formatHit).join("\n\n");
  const user = `환자 기본 정보와 최근 기록:\n${patientContext(state.patientId)}\n\n검색된 관련 지침과 기록:\n${ctx}\n\n구조화된 증상:\n${JSON.stringify(
    state.symptoms,
    null,
    2
  )}\n\n대화 원문:\n${transcriptText(state.turns)}`;
  const res = tidyDeep(await llm.invoke([new SystemMessage(sys), new HumanMessage(user)]));
  return {
    assessment: res,
    trace: [
      {
        node: "assess",
        label: "위험도 평가",
        summary: `${res.headline.replace(/\.$/, "")}. 증상만 보면 ${res.symptomOnlyLevel}, 검사 결합 후 ${res.level}`,
        at: Date.now(),
      },
    ],
  };
}

async function composeNode(state: typeof TriageState.State) {
  const p = getPatient(state.patientId)!;
  const a = state.assessment!;
  const llm = makeLLM({ effort: "low" }).withStructuredOutput(OutputSchema, { method: "jsonSchema" });
  const sys = `당신은 조혈모세포이식 센터의 전문간호사다. 위험도 평가 결과를 바탕으로 환자용 안내문과 의료진용 SBAR 요약을 쓴다.
환자 안내문 규칙: 첫 문장은 반드시 "${LEVEL_LABEL[a.level]}"로 시작. 왜 그런 판단인지 환자가 이해할 수 있게 쉬운 말로. 검사 수치를 언급할 때는 의미를 함께. 겁주지 않되 필요한 행동은 분명히.
의료진 SBAR 규칙: 임상 문체, 수치와 날짜 포함, 각 항목 2문장 이내.
${STYLE_RULES}`;
  const user = `환자: ${p.name}, 이식후 D+${daysSince(p.transplantDate)}, 다음 외래 ${p.nextVisit}, 담당 ${p.nurse}\n증상: ${JSON.stringify(
    state.symptoms
  )}\n평가: ${JSON.stringify(a)}\n대화 원문:\n${transcriptText(state.turns)}`;
  const res = tidyDeep(await llm.invoke([new SystemMessage(sys), new HumanMessage(user)]));
  return {
    outputs: res,
    trace: [{ node: "compose", label: "안내문 생성", summary: res.alertTitle, at: Date.now() }],
  };
}

async function notifyNode(state: typeof TriageState.State) {
  const p = getPatient(state.patientId)!;
  const alert: TriageAlert = {
    id: `al-${Date.now()}`,
    patientId: p.id,
    patientName: p.name,
    level: state.assessment!.level,
    title: state.outputs!.alertTitle,
    createdAt: new Date().toISOString(),
    status: "new",
    chiefComplaint: state.symptoms!.chiefComplaint,
    sbar: state.outputs!.sbar,
    assessment: state.assessment!,
    symptoms: state.symptoms!,
    transcript: state.turns,
    patientMessage: state.outputs!.patientMessage,
    patientActions: state.outputs!.patientActions,
    kgPaths: state.kgPaths,
    contextTitles: state.context.map((h) => h.title),
  };
  return {
    alert,
    trace: [
      {
        node: "notify",
        label: "의료진 알림",
        summary:
          alert.level === "green"
            ? `${p.nurse}에게 기록만 전달`
            : `${p.nurse}에게 ${alert.level === "red" ? "긴급" : "확인 요청"} 알림 발송`,
        at: Date.now(),
      },
    ],
  };
}

export const triageGraph = new StateGraph(TriageState)
  .addNode("extract", extractNode)
  .addNode("retrieve", retrieveNode)
  .addNode("assess", assessNode)
  .addNode("compose", composeNode)
  .addNode("notify", notifyNode)
  .addEdge(START, "extract")
  .addConditionalEdges("extract", (s) => (s.needMoreInfo ? END : "retrieve"), { [END]: END, retrieve: "retrieve" })
  .addEdge("retrieve", "assess")
  .addEdge("assess", "compose")
  .addEdge("compose", "notify")
  .addEdge("notify", END)
  .compile();

export type TriageStateType = typeof TriageState.State;
