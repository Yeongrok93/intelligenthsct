"use client";
import type { Patient } from "@/data/patients";

// 바이러스 PCR이나 간수치처럼 날짜별로 반복되는 항목의 추세를 작은 선 그래프로 보여준다.
export function seriesFor(p: Patient, itemName: string) {
  const pts: { date: string; value: number; raw: string }[] = [];
  for (const lab of p.labs) {
    const it = lab.items.find((i) => i.name === itemName);
    if (!it) continue;
    const n = Number(String(it.value).replace(/,/g, ""));
    pts.push({ date: lab.date, value: Number.isFinite(n) ? n : 0, raw: it.value });
  }
  return pts.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export default function LabTrend({ title, points, unit, threshold, thresholdLabel }: { title: string; points: { date: string; value: number; raw: string }[]; unit?: string; threshold?: number; thresholdLabel?: string }) {
  if (points.length === 0) return null;
  const w = 260;
  const h = 72;
  const pad = 6;
  const max = Math.max(...points.map((p) => p.value), threshold ?? 0) || 1;
  const x = (i: number) => (points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1));
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const last = points[points.length - 1];
  const rising = points.length >= 2 && last.value > points[points.length - 2].value;
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-ink-soft">{title}</p>
        <p className="text-sm font-bold">
          {last.raw} <span className="text-xs font-normal text-ink-mute">{unit}</span>
          {rising && <span className="ml-1 text-xs text-risk-yellow">상승</span>}
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-[72px] w-full">
        {threshold !== undefined && (
          <>
            <line x1={pad} x2={w - pad} y1={y(threshold)} y2={y(threshold)} stroke="#d97706" strokeDasharray="3 3" strokeWidth="1" />
            <text x={w - pad} y={y(threshold) - 3} textAnchor="end" fontSize="9" fill="#d97706">
              {thresholdLabel ?? threshold}
            </text>
          </>
        )}
        <path d={d} fill="none" stroke="#0f766e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3" fill="#0f766e" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-ink-mute">
        {points.map((p) => (
          <span key={p.date}>{p.date.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}
