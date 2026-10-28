"use client";
// 의료진 웹의 알림 센터. 새 알림이 들어오면 큰 토스트와 소리로 알리고, 심사용으로 알림을 재생할 수 있다.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAlerts, addAlert } from "@/lib/alertsStore";
import { demoScenarios } from "@/data/seedAlerts";
import { LEVEL_STYLE, RiskBadge } from "@/components/ui";
import type { TriageAlert, TraceStep } from "@/lib/graph/triage";

const SEEN_KEY = "hsct-care-seen-alerts";

function chime(level: TriageAlert["level"]) {
  try {
    const ac = new AudioContext();
    const pattern = level === "red" ? [880, 660, 880, 660, 880] : level === "yellow" ? [784, 988] : [660];
    pattern.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = 0.0001;
      o.connect(g).connect(ac.destination);
      const t = ac.currentTime + i * 0.22;
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.start(t);
      o.stop(t + 0.22);
    });
    setTimeout(() => ac.close().catch(() => {}), 2000);
  } catch {}
}

function notify(a: TriageAlert) {
  try {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") new Notification(`${LEVEL_STYLE[a.level].emoji} ${a.patientName} ${a.title}`, { body: a.sbar.situation });
  } catch {}
}

export default function AlarmCenter() {
  const { alerts, ready } = useAlerts();
  const [toasts, setToasts] = useState<TriageAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<{ name: string; steps: TraceStep[] } | null>(null);
  const [useAI, setUseAI] = useState(false);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!seenRef.current) {
      let saved: string[] = [];
      try {
        saved = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
      } catch {}
      seenRef.current = new Set(saved.length ? saved : alerts.map((a) => a.id));
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current]));
      } catch {}
      return;
    }
    const fresh = alerts.filter((a) => !seenRef.current!.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => seenRef.current!.add(a.id));
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current]));
    } catch {}
    setToasts((t) => [...fresh, ...t].slice(0, 4));
    const top = fresh.sort((a, b) => ({ red: 0, yellow: 1, green: 2 })[a.level] - ({ red: 0, yellow: 1, green: 2 })[b.level])[0];
    chime(top.level);
    fresh.forEach(notify);
    fresh.filter((a) => a.level === "green").forEach((a) => setTimeout(() => setToasts((t) => t.filter((x) => x.id !== a.id)), 9000));
  }, [alerts, ready]);

  function playScenario(idx: number) {
    const sc = demoScenarios[idx];
    setOpen(false);
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch {}
    if (!useAI) {
      setRunning({ name: sc.name, steps: [] });
      setTimeout(() => {
        addAlert({ ...sc.alert, id: `play-${Date.now()}`, createdAt: new Date().toISOString(), status: "new" });
        setRunning(null);
      }, 1200);
      return;
    }
    setRunning({ name: sc.name, steps: [] });
    (async () => {
      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: sc.alert.patientId, turns: sc.alert.transcript }),
        });
        if (!res.ok || !res.body) throw new Error("서버 오류");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let alert: TriageAlert | null = null;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line) as { type: string; trace?: TraceStep[]; alert?: TriageAlert | null; message?: string };
            if (ev.type === "node" && ev.trace) setRunning((r) => (r ? { ...r, steps: [...r.steps, ...ev.trace!] } : r));
            if (ev.type === "done") alert = ev.alert ?? null;
            if (ev.type === "error") throw new Error(ev.message);
          }
        }
        if (alert) addAlert(alert);
        else addAlert({ ...sc.alert, id: `play-${Date.now()}`, createdAt: new Date().toISOString(), status: "new" });
      } catch {
        addAlert({ ...sc.alert, id: `play-${Date.now()}`, createdAt: new Date().toISOString(), status: "new" });
      } finally {
        setRunning(null);
      }
    })();
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border-2 border-risk-red bg-risk-red-soft px-3 py-1.5 text-sm font-bold text-risk-red transition hover:bg-red-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          알림 재생
        </button>
        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-xl">
            <p className="text-xs text-ink-soft">심사용 기능입니다. 환자 앱에서 증상이 들어온 상황을 재현합니다.</p>
            <ul className="mt-2 space-y-1.5">
              {demoScenarios.map((s, i) => (
                <li key={s.name}>
                  <button onClick={() => playScenario(i)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-brand hover:bg-stone-50">
                    <span>
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-[11px] text-ink-mute">{s.alert.patientName}, {s.hint}</span>
                    </span>
                    <RiskBadge level={s.alert.level} />
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
              AI 파이프라인을 실제로 실행, 약 1분 소요
            </label>
          </div>
        )}
      </div>

      {running && (
        <div className="fixed bottom-5 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl border border-line bg-card p-4 shadow-xl fade-up">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            {running.name} 수신 중
          </div>
          {running.steps.length > 0 && (
            <ol className="mt-2 space-y-1">
              {running.steps.map((s, i) => (
                <li key={i} className="text-xs text-ink-soft">
                  <span className="font-semibold text-ink">{s.label}</span> {s.summary.slice(0, 80)}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="pointer-events-none fixed right-4 top-16 z-40 flex w-[min(92vw,24rem)] flex-col gap-3">
        {toasts.map((a) => {
          const s = LEVEL_STYLE[a.level];
          return (
            <div key={a.id} className={`pointer-events-auto overflow-hidden rounded-2xl border-2 bg-card shadow-2xl fade-up ${a.level === "red" ? "border-risk-red" : a.level === "yellow" ? "border-risk-yellow" : "border-risk-green"}`}>
              <div className={`flex items-center justify-between px-4 py-2 ${s.bg}`}>
                <span className={`flex items-center gap-2 text-sm font-bold ${s.fg}`}>
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot} ${a.level !== "green" ? "pulse-ring" : ""}`} />
                  새 알림 {s.emoji} {s.name}
                </span>
                <button onClick={() => setToasts((t) => t.filter((x) => x.id !== a.id))} className="text-xs text-ink-soft hover:text-ink">
                  닫기
                </button>
              </div>
              <div className="px-4 py-3">
                <p className="text-base font-bold">
                  {a.patientName} <span className="font-semibold text-ink-soft">{a.title}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{a.sbar.situation}</p>
                <Link href={`/medical/alerts/${a.id}`} onClick={() => setToasts((t) => t.filter((x) => x.id !== a.id))} className="mt-2 inline-block rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">
                  바로 열기
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
