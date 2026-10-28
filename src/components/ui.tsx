"use client";
import type { RiskLevel } from "@/data/patients";
import { LEVEL_LABEL } from "@/lib/levels";

export const LEVEL_STYLE: Record<RiskLevel, { bg: string; fg: string; dot: string; name: string; emoji: string }> = {
  red: { bg: "bg-risk-red-soft", fg: "text-risk-red", dot: "bg-risk-red", name: "응급실", emoji: "🔴" },
  yellow: { bg: "bg-risk-yellow-soft", fg: "text-risk-yellow", dot: "bg-risk-yellow", name: "전화 확인", emoji: "🟡" },
  green: { bg: "bg-risk-green-soft", fg: "text-risk-green", dot: "bg-risk-green", name: "자가관리", emoji: "🟢" },
};

export function RiskBadge({ level, size = "sm" }: { level: RiskLevel; size?: "sm" | "md" }) {
  const s = LEVEL_STYLE[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.bg} ${s.fg} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.name}
    </span>
  );
}

export function LevelBanner({ level, children }: { level: RiskLevel; children?: React.ReactNode }) {
  const s = LEVEL_STYLE[level];
  return (
    <div className={`rounded-2xl ${s.bg} p-5 fade-up`}>
      <p className={`text-2xl ${s.fg}`}>{s.emoji}</p>
      <p className={`mt-2 text-xl font-bold leading-snug ${s.fg}`}>{LEVEL_LABEL[level]}</p>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-base font-bold">{children}</h2>
      {sub && <p className="text-xs text-ink-mute">{sub}</p>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-40";
  const v =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-deep"
      : variant === "danger"
        ? "bg-risk-red text-white hover:brightness-95"
        : "border border-line bg-card text-ink hover:bg-gray-50";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-mute">{children}</div>;
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
