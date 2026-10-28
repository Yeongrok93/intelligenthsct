"use client";
import { useEffect, useState } from "react";

export type Status = { label: string; hints?: string[] };

// 서버가 보낸 진행 단계를 순서대로 보여준다. 끝난 단계는 체크, 진행 중인 단계는 문구가 번갈아 바뀌고 경과 시간이 올라간다.
export default function ProgressSteps({ statuses, finished = false }: { statuses: Status[]; finished?: boolean }) {
  const [tick, setTick] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    setStartedAt(Date.now());
    setTick(0);
  }, [statuses.length]);

  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [finished, statuses.length]);

  if (statuses.length === 0) return null;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return (
    <ul className="space-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm" aria-live="polite">
      {statuses.map((s, i) => {
        const active = !finished && i === statuses.length - 1;
        const hints = s.hints && s.hints.length > 0 ? s.hints : [s.label];
        const text = active ? hints[Math.floor(tick / 2.5) % hints.length] : s.label;
        return (
          <li key={i} className={`flex items-center gap-2 ${active ? "text-ink" : "text-ink-mute"}`}>
            {active ? (
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-risk-green">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="flex-1">{text}</span>
            {active && elapsed >= 3 && <span className="text-xs tabular-nums text-ink-mute">{elapsed}초</span>}
          </li>
        );
      })}
    </ul>
  );
}
