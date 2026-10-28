"use client";
import Link from "next/link";
import { Card, RiskBadge } from "@/components/ui";
import { useAlerts } from "@/lib/alertsStore";
import { patients, daysSince } from "@/data/patients";

export default function PatientList() {
  const { alerts } = useAlerts();
  return (
    <div>
      <h1 className="text-2xl font-bold">환자 목록</h1>
      <p className="mb-5 text-sm text-ink-soft">담당 이식 환자와 최근 알림</p>
      <div className="grid gap-3 md:grid-cols-3">
        {patients.map((p) => {
          const mine = alerts.filter((a) => a.patientId === p.id);
          const open = mine.filter((a) => a.status !== "done");
          return (
            <Link key={p.id} href={`/medical/patients/${p.id}`}>
              <Card className="h-full transition hover:border-gray-400">
                <p className="text-lg font-bold">
                  {p.name} <span className="text-xs font-normal text-ink-mute">{p.age}세 {p.sex}</span>
                </p>
                <p className="text-xs text-ink-soft">
                  {p.diagnosis}, {p.transplantType}
                </p>
                <p className="mt-2 text-sm">
                  D+{daysSince(p.transplantDate)} <span className="text-xs text-ink-mute">다음 외래 {p.nextVisit}</span>
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                  {p.currentIssues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2 text-xs text-ink-mute">
                  알림 {mine.length}건, 처리 전 {open.length}건
                  {open[0] && <RiskBadge level={open[0].level} />}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
