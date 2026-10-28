"use client";
import { useEffect, useRef, useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import { Spinner } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";

type Ref = { pmid: string; title: string; journal: string; year: string; url: string };
type Msg = { role: "user" | "assistant"; text: string; basis?: string[]; escalate?: boolean; followUps?: string[]; references?: Ref[]; searched?: string };

const TOPICS = ["복직은 언제쯤 가능할까요", "헬스장 다녀도 되나요", "독감 예방접종 맞아도 되나요", "제주도 여행 가도 될까요", "감기 기운이 있는데 동네 병원 가도 되나요", "머리 염색해도 되나요", "홍삼 먹어도 되나요"];

export default function ChatPage() {
  const { patient } = usePatient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", text: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, messages: next.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = (await r.json()) as { answer: string; basis: string[]; escalate: boolean; followUps: string[]; references?: Ref[]; searched?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? "오류");
      setMsgs([...next, { role: "assistant", text: data.answer, basis: data.basis, escalate: data.escalate, followUps: data.followUps, references: data.references ?? [], searched: data.searched }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", text: e instanceof Error ? `오류가 났습니다. ${e.message}` : "오류가 났습니다." }]);
    } finally {
      setBusy(false);
    }
  }

  const last = msgs[msgs.length - 1];

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <PatientHeader title="일상생활 상담" sub="운동, 복직, 여행, 접종, 피부와 모발, 보조식품" />

      {msgs.length === 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <button key={t} onClick={() => send(t)} className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-soft hover:border-brand hover:text-brand">
              {t}
            </button>
          ))}
        </div>
      )}

      <ul className="flex-1 space-y-3">
        {msgs.map((m, i) => (
          <li key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] ${m.role === "user" ? "" : "space-y-2"}`}>
              <p className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-line bg-card"}`}>{m.text}</p>
              {m.escalate && <p className="rounded-xl bg-risk-yellow-soft px-3 py-2 text-xs font-semibold text-risk-yellow">이 내용은 담당 의료진 확인이 필요합니다</p>}
              {m.basis && m.basis.length > 0 && (
                <p className="px-1 text-[11px] leading-relaxed text-ink-mute">근거: {m.basis.join(". ")}</p>
              )}
              {m.references && m.references.length > 0 && (
                <div className="rounded-xl border border-line bg-card px-3 py-2">
                  <p className="text-[11px] font-semibold text-ink-soft">참고 문헌, PubMed 검색</p>
                  <ul className="mt-1 space-y-1">
                    {m.references.map((r) => (
                      <li key={r.pmid} className="text-[11px] leading-snug text-ink-soft">
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {r.title}
                        </a>{" "}
                        {r.journal} {r.year}, PMID {r.pmid}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        ))}
        {busy && (
          <li>
            <Spinner label="환자분 상태에 맞춰 답을 준비하는 중" />
          </li>
        )}
        <div ref={endRef} />
      </ul>

      {last?.role === "assistant" && last.followUps && last.followUps.length > 0 && !busy && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {last.followUps.map((f) => (
            <button key={f} onClick={() => send(f)} className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1.5 text-xs text-brand-deep">
              {f}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-20 mt-3 flex gap-2 bg-paper pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="궁금한 것을 물어보세요"
          className="flex-1 rounded-xl border border-line bg-card px-3 py-3 text-sm outline-none focus:border-brand"
        />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">
          보내기
        </button>
      </form>
    </div>
  );
}
