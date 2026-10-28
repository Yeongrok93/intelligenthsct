"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, Empty, RiskBadge, fmtTime } from "@/components/ui";
import { useAlerts } from "@/lib/alertsStore";
import { patients, daysSince } from "@/data/patients";
import type { RiskLevel } from "@/data/patients";

const ORDER: Record<RiskLevel, number> = { red: 0, yellow: 1, green: 2 };
const STATUS: Record<string, string> = { new: "미확인", acknowledged: "확인함", done: "처리 완료" };

export default function MedicalDashboard() {
  const { alerts, ready, reset } = useAlerts();
  const [filter, setFilter] = useState<"all" | "open" | RiskLevel>("open");

  const visible = alerts
    .filter((a) => (filter === "all" ? true : filter === "open" ? a.status !== "done" : a.level === filter))
    .sort((a, b) => {
      const s = (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0);
      if (s !== 0) return s;
      const l = ORDER[a.level] - ORDER[b.level];
      if (l !== 0) return l;
      return b.createdAt > a.createdAt ? 1 : -1;
    });

  const count = (lv: RiskLevel) => alerts.filter((a) => a.level === lv && a.status !== "done").length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">알림 큐</h1>
          <p className="text-sm text-ink-soft">환자 앱에서 들어온 증상 보고를 위험도순으로 보여줍니다</p>
        </div>
        <button onClick={reset} className="text-sm text-ink-mute underline">
          데모 상태 초기화
        </button>
      </div>

      {ready && alerts.some((a) => a.status === "new" && a.level !== "green") && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-risk-red bg-risk-red-soft px-4 py-3 text-sm font-semibold text-risk-red">
          <span className="relative inline-flex h-3 w-3 rounded-full bg-risk-red pulse-ring" />
          확인이 필요한 알림 {alerts.filter((a) => a.status === "new" && a.level !== "green").length}건이 있습니다
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {(["red", "yellow", "green"] as RiskLevel[]).map((lv) => (
          <button key={lv} onClick={() => setFilter(filter === lv ? "open" : lv)} className={`text-left ${filter === lv ? "ring-2 ring-brand" : ""} rounded-lg`}>
            <Card>
              <div className="flex items-center justify-between">
                <RiskBadge level={lv} size="md" />
                <span className="text-3xl font-bold">{ready ? count(lv) : ""}</span>
              </div>
              <p className="mt-2 text-sm text-ink-mute">{lv === "red" ? "응급실 안내가 나간 건" : lv === "yellow" ? "전화 확인이 필요한 건" : "기록용으로 들어온 건"}</p>
            </Card>
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm">
        {(["open", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 font-semibold ${filter === f ? "bg-ink text-white" : "border border-line bg-card text-ink-soft"}`}>
            {f === "open" ? "처리 전" : "전체"}
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-line bg-card">
        {!ready ? (
          <div className="p-6 text-sm text-ink-mute">불러오는 중</div>
        ) : visible.length === 0 ? (
          <div className="p-6">
            <Empty>해당하는 알림이 없습니다</Empty>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-sm text-ink-mute">
              <tr>
                <th className="px-4 py-2.5 font-semibold">등급</th>
                <th className="px-4 py-2.5 font-semibold">환자</th>
                <th className="px-4 py-2.5 font-semibold">알림</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">주 호소</th>
                <th className="px-4 py-2.5 font-semibold">시각</th>
                <th className="px-4 py-2.5 font-semibold">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((a) => {
                const p = patients.find((x) => x.id === a.patientId);
                return (
                  <tr key={a.id} className={`transition hover:bg-gray-50 ${a.status === "done" ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <RiskBadge level={a.level} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/medical/alerts/${a.id}`} className="font-semibold hover:underline">
                        {a.patientName}
                      </Link>
                      <p className="text-sm text-ink-mute">
                        {p ? `D+${daysSince(p.transplantDate)}` : ""} {p?.diagnosis}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/medical/alerts/${a.id}`} className="font-semibold hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-ink-soft md:table-cell">{a.chiefComplaint}</td>
                    <td className="px-4 py-3 text-sm text-ink-mute">{fmtTime(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "new" ? "bg-risk-red-soft text-risk-red" : a.status === "acknowledged" ? "bg-gray-100 text-ink-soft" : "bg-risk-green-soft text-risk-green"}`}>
                        {STATUS[a.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-base font-bold">담당 환자</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {patients.map((p) => {
            const open = alerts.filter((a) => a.patientId === p.id && a.status !== "done");
            const top = open.sort((a, b) => ORDER[a.level] - ORDER[b.level])[0];
            return (
              <Link key={p.id} href={`/medical/patients/${p.id}`}>
                <Card className="h-full transition hover:border-gray-400">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">
                      {p.name} <span className="text-sm font-normal text-ink-mute">{p.age}세 {p.sex}</span>
                    </p>
                    {top ? <RiskBadge level={top.level} /> : <span className="text-sm text-ink-mute">알림 없음</span>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {p.diagnosis}, D+{daysSince(p.transplantDate)}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
                    {p.currentIssues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
