"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/lib/alertsStore";
import AlarmCenter from "@/components/AlarmCenter";
import ViewSwitch from "@/components/ViewSwitch";

export default function MedicalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { alerts } = useAlerts();
  const newCount = alerts.filter((a) => a.status === "new").length;
  const nav = [
    { href: "/medical", label: "홈", badge: newCount },
    { href: "/medical/patients", label: "환자 목록" },
    { href: "/medical/sources", label: "근거 문서" },
  ];
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link href="/medical" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">HC</span>
              <span className="hidden text-sm font-bold text-gray-900 sm:inline">이식 후 돌봄 AI</span>
            </Link>
            <nav className="flex items-center gap-1">
              {nav.map((n) => {
                const active = n.href === "/medical" ? path === "/medical" || path.startsWith("/medical/alerts") : path.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    {n.label}
                    {n.badge ? <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{n.badge}</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <ViewSwitch current="medical" />
            <AlarmCenter />
            <span className="hidden sm:inline">강영아 전문간호사</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
