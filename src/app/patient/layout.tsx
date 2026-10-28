"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/patient", label: "홈", icon: "M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" },
  { href: "/patient/symptom", label: "증상", icon: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" },
  { href: "/patient/skin", label: "피부", icon: "M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/patient/food", label: "음식", icon: "M3 11h18M5 11a7 7 0 0 1 14 0M4 15h16M7 19h10" },
  { href: "/patient/meds", label: "약", icon: "M10.5 3.5l10 10-7 7-10-10zM7 17l-3 3M13 7l4 4" },
  { href: "/patient/chat", label: "상담", icon: "M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:border sm:border-line sm:shadow-xl">
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-white/95 backdrop-blur sm:rounded-b-[2rem]">
        <ul className="grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => {
            const active = t.href === "/patient" ? path === "/patient" : path.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link href={t.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? "text-brand" : "text-ink-mute"}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
