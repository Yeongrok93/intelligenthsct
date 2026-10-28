"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/lib/alertsStore";
import AlarmCenter from "@/components/AlarmCenter";

export default function MedicalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { alerts } = useAlerts();
  const newCount = alerts.filter((a) => a.status === "new").length;
  const nav = [
    { href: "/medical", label: "알림 큐", badge: newCount },
    { href: "/medical/patients", label: "환자 목록" },
    { href: "/medical/knowledge", label: "지식그래프" },
  ];
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/medical" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">HC</span>
              <span className="hidden text-sm font-bold sm:inline">
                이식 후 돌봄 AI <span className="ml-1 font-normal text-ink-mute">의료진</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((n) => {
                const active = n.href === "/medical" ? path === "/medical" || path.startsWith("/medical/alerts") : path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? "bg-stone-100 text-ink" : "text-ink-soft hover:text-ink"}`}>
                    {n.label}
                    {n.badge ? <span className="rounded-full bg-risk-red px-1.5 text-[10px] font-bold text-white">{n.badge}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-soft">
            <AlarmCenter />
            <span className="hidden sm:inline">강영아 전문간호사</span>
            <span className="h-7 w-7 rounded-full bg-brand-soft text-center text-xs font-bold leading-7 text-brand">강</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
