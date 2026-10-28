"use client";
import { useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import VoiceRecorder from "@/components/VoiceRecorder";
import { Button, Card, LevelBanner, LEVEL_STYLE, RiskBadge } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";
import { addAlert } from "@/lib/alertsStore";
import type { Assessment, Outputs, Symptoms, TraceStep, TriageAlert, Turn } from "@/lib/graph/triage";

type Done = {
  needMoreInfo: boolean;
  questions: string[];
  symptoms: Symptoms | null;
  assessment: Assessment | null;
  outputs: Outputs | null;
  alert: TriageAlert | null;
  context: { id: string; title: string; kind: string; score: number }[];
  kgPaths?: string[];
  trace: TraceStep[];
};

const NODES = [
  { key: "extract", label: "증상 추출" },
  { key: "clarify", label: "추가 질문" },
  { key: "retrieve", label: "검사 데이터 결합" },
  { key: "assess", label: "위험도 평가" },
  { key: "compose", label: "안내문 생성" },
  { key: "notify", label: "의료진 알림" },
];

export default function SymptomPage() {
  const { patient } = usePatient();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "question" | "result" | "error">("idle");
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [result, setResult] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  async function run(nextTurns: Turn[]) {
    setPhase("running");
    setTrace([]);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, turns: nextTurns }),
      });
      if (!res.ok || !res.body) throw new Error("서버 응답 오류");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done: Done | null = null;
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { type: string; trace?: TraceStep[]; message?: string } & Partial<Done>;
          if (ev.type === "node" && ev.trace) setTrace((t) => [...t, ...ev.trace!]);
          else if (ev.type === "done") done = ev as unknown as Done;
          else if (ev.type === "error") throw new Error(ev.message);
        }
      }
      if (!done) throw new Error("결과를 받지 못했습니다");
      setResult(done);
      if (done.needMoreInfo) {
        const q = done.questions.join(" ");
        setTurns([...nextTurns, { role: "assistant", text: q }]);
        setPhase("question");
      } else {
        if (done.alert) addAlert(done.alert);
        setPhase("result");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      setPhase("error");
    }
  }

  function onTranscript(text: string) {
    const next = [...turns, { role: "patient" as const, text }];
    setTurns(next);
    run(next);
  }

  function reset() {
    setTurns([]);
    setTrace([]);
    setResult(null);
    setPhase("idle");
    setShowWhy(false);
  }

  const lastQuestion = phase === "question" ? turns[turns.length - 1]?.text : null;
  const doneNodes = new Set(trace.map((t) => t.node));

  return (
    <div>
      <PatientHeader title="증상 말하기" sub="말씀하신 내용과 최근 검사 결과를 함께 보고 판단합니다" />

      {turns.length > 0 && (
        <ul className="mb-4 space-y-2">
          {turns.map((t, i) => (
            <li key={i} className={`flex ${t.role === "patient" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  t.role === "patient" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-line bg-card"
                }`}
              >
                {t.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      {(phase === "idle" || phase === "question" || phase === "error") && (
        <VoiceRecorder
          onTranscript={onTranscript}
          prompt={
            phase === "idle"
              ? "어디가 어떻게 불편한지, 언제부터인지, 열이 있는지 편하게 말씀해 주세요. 표현하기 어려워도 괜찮습니다."
              : lastQuestion
                ? "위 질문에 답해 주세요."
                : undefined
          }
        />
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-risk-red-soft p-3 text-sm text-risk-red">
          {error}
          <button onClick={reset} className="ml-2 underline">
            처음부터
          </button>
        </div>
      )}

      {(phase === "running" || trace.length > 0) && phase !== "result" && (
        <Card className="mt-4">
          <p className="mb-2 text-xs font-semibold text-ink-mute">AI가 판단하는 과정</p>
          <ol className="space-y-2">
            {NODES.map((n, i) => {
              const step = trace.find((t) => t.node === n.key);
              const isNext = !step && phase === "running" && NODES.slice(0, i).every((m) => doneNodes.has(m.key));
              return (
                <li key={n.key} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step ? "bg-brand text-white" : isNext ? "border-2 border-brand text-brand" : "border border-line text-ink-mute"
                    }`}
                  >
                    {step ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${step || isNext ? "text-ink" : "text-ink-mute"}`}>
                      {n.label}
                      {isNext && <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent align-middle" />}
                    </p>
                    {step && <p className="text-xs leading-relaxed text-ink-soft">{step.summary}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {phase === "result" && result?.assessment && result.outputs && (
        <div className="space-y-3">
          <LevelBanner level={result.assessment.level}>
            <p className="mt-3 text-sm leading-relaxed text-ink">{result.outputs.patientMessage}</p>
          </LevelBanner>

          {result.outputs.patientActions.length > 0 && (
            <Card>
              <p className="mb-2 text-xs font-semibold text-ink-mute">지금 할 일</p>
              <ul className="space-y-1.5">
                {result.outputs.patientActions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {a}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.assessment.level !== "green" && (
            <Card className="bg-brand-soft">
              <p className="text-sm font-semibold text-brand-deep">{patient.nurse}에게 알림을 보냈습니다</p>
              <p className="mt-1 text-xs text-ink-soft">의료진이 확인 후 연락드립니다. 급해지면 응급실로 바로 가세요.</p>
            </Card>
          )}

          <button onClick={() => setShowWhy((v) => !v)} className="w-full rounded-xl border border-line bg-card px-4 py-3 text-left text-sm font-semibold">
            왜 이렇게 판단했나요 {showWhy ? "닫기" : "보기"}
          </button>
          {showWhy && (
            <Card className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-mute">증상만 보면</span>
                <RiskBadge level={result.assessment.symptomOnlyLevel} />
                <span className="text-ink-mute">→ 검사와 함께 보면</span>
                <RiskBadge level={result.assessment.level} />
              </div>
              {result.assessment.whyChanged !== "동일" && <p className="text-sm leading-relaxed">{result.assessment.whyChanged}</p>}
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-mute">판단에 쓴 검사 결과</p>
                <ul className="space-y-1">
                  {result.assessment.labSignals.map((s, i) => (
                    <li key={i} className="text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              {result.kgPaths && result.kgPaths.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink-mute">지식그래프가 연결한 개념</p>
                  <ul className="space-y-0.5">
                    {result.kgPaths.map((pth, i) => (
                      <li key={i} className="text-xs text-ink-soft">
                        {pth}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {result.assessment.axes.map((ax) => (
                  <div key={ax.name} className="rounded-xl bg-stone-50 p-2.5">
                    <p className="text-xs font-bold">
                      {ax.name} <span className={ax.risk === "높음" ? "text-risk-red" : ax.risk === "중간" ? "text-risk-yellow" : "text-risk-green"}>{ax.risk}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{ax.evidence.slice(0, 2).join(". ")}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button variant="ghost" onClick={reset} className="w-full">
            다른 증상 말하기
          </Button>
          <p className="text-center text-[11px] text-ink-mute">
            등급 색은 {LEVEL_STYLE.red.emoji} 응급실, {LEVEL_STYLE.yellow.emoji} 전화 확인, {LEVEL_STYLE.green.emoji} 자가관리입니다
          </p>
        </div>
      )}
    </div>
  );
}
