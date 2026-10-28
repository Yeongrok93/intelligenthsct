"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Empty, RiskBadge, fmtTime } from "@/components/ui";
import LabTrend, { seriesFor } from "@/components/LabTrend";
import { useAlerts } from "@/lib/alertsStore";
import { patients, daysSince } from "@/data/patients";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { alerts } = useAlerts();
  const p = patients.find((x) => x.id === id);
  if (!p) return <Empty>환자를 찾을 수 없습니다</Empty>;
  const mine = alerts.filter((a) => a.patientId === p.id);
  const labsByDate = [...p.labs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const ebv = seriesFor(p, "EBV RQ-PCR");
  const cmv = seriesFor(p, "CMV RQ-PCR");

  return (
    <div>
      <Link href="/medical/patients" className="text-xs text-ink-mute hover:underline">
        ← 환자 목록
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {p.name} <span className="text-base font-normal text-ink-mute">{p.age}세 {p.sex}</span>
      </h1>
      <p className="text-sm text-ink-soft">
        {p.diagnosis}, {p.transplantType}, 이식일 {p.transplantDate}, D+{daysSince(p.transplantDate)}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">이식 정보</p>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              <dt className="text-ink-mute">공여자</dt>
              <dd>{p.donor}</dd>
              <dt className="text-ink-mute">전처치</dt>
              <dd>{p.conditioning}</dd>
              <dt className="text-ink-mute">GVHD 예방</dt>
              <dd>{p.gvhdProphylaxis}</dd>
              <dt className="text-ink-mute">현재 문제</dt>
              <dd>{p.currentIssues.join(", ")}</dd>
              <dt className="text-ink-mute">다음 외래</dt>
              <dd>{p.nextVisit}</dd>
            </dl>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">검사 결과</p>
            <div className="space-y-3">
              {labsByDate.map((lab) => (
                <div key={lab.category + lab.date}>
                  <p className="text-xs font-bold">
                    {lab.date} <span className="text-ink-mute">{lab.category}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {lab.items.map((i) => (
                      <span key={i.name} className={`rounded-lg border px-2 py-1 text-xs ${i.flag === "H" ? "border-risk-yellow/40 bg-risk-yellow-soft" : i.flag === "L" ? "border-sky-200 bg-sky-50" : "border-line bg-card"}`}>
                        <span className="text-ink-mute">{i.name}</span> <span className="font-semibold">{i.value}</span> {i.unit}
                      </span>
                    ))}
                  </div>
                  {lab.note && <p className="mt-1 text-xs text-ink-soft">{lab.note}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">진료 기록</p>
            <ul className="space-y-2 text-sm">
              {p.visits.map((v) => (
                <li key={v.date} className="grid grid-cols-[5.5rem_1fr] gap-2">
                  <span className="text-xs text-ink-mute">
                    {v.date} {v.type}
                  </span>
                  <span className="leading-relaxed">{v.summary}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">바이러스 추세</p>
            <div className="space-y-2">
              {ebv.some((x) => x.value > 0) ? <LabTrend title="EBV RQ-PCR" points={ebv} unit="copies/mL" threshold={10000} thresholdLabel="10,000" /> : <p className="text-xs text-ink-mute">EBV 미검출</p>}
              {cmv.some((x) => x.value > 0) ? <LabTrend title="CMV RQ-PCR" points={cmv} unit="IU/mL" threshold={1000} thresholdLabel="1,000" /> : <p className="text-xs text-ink-mute">CMV 미검출</p>}
            </div>
          </Card>
          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">복용약</p>
            <ul className="space-y-1 text-xs">
              {p.medications.map((m) => (
                <li key={m.name}>
                  <span className="font-semibold">{m.name}</span> {m.dose}
                  <span className="text-ink-mute">, {m.purpose}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="mb-2 text-xs font-semibold text-ink-mute">알림 이력</p>
            {mine.length === 0 ? (
              <p className="text-xs text-ink-mute">없음</p>
            ) : (
              <ul className="space-y-2">
                {mine.map((a) => (
                  <li key={a.id}>
                    <Link href={`/medical/alerts/${a.id}`} className="flex items-center justify-between gap-2 text-sm hover:underline">
                      <span className="truncate">{a.title}</span>
                      <RiskBadge level={a.level} />
                    </Link>
                    <p className="text-[11px] text-ink-mute">{fmtTime(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
