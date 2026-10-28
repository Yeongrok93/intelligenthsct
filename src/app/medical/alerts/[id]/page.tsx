"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, Empty, RiskBadge, fmtTime } from "@/components/ui";
import LabTrend, { seriesFor } from "@/components/LabTrend";
import { useAlerts } from "@/lib/alertsStore";
import { patients, daysSince } from "@/data/patients";
import { LEVEL_LABEL } from "@/lib/levels";

export default function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const { alerts, ready, setStatus, notes, setNote } = useAlerts();
  const a = alerts.find((x) => x.id === id);
  if (!ready) return <p className="text-sm text-ink-mute">불러오는 중</p>;
  if (!a) return <Empty>알림을 찾을 수 없습니다</Empty>;
  const p = patients.find((x) => x.id === a.patientId)!;
  const ebv = seriesFor(p, "EBV RQ-PCR");
  const cmv = seriesFor(p, "CMV RQ-PCR");
  const bil = seriesFor(p, "T.bil");
  const taccro = seriesFor(p, "Tacrolimus trough");

  return (
    <div>
      <Link href="/medical" className="text-sm hover:underline">
        ← 알림 큐
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <RiskBadge level={a.level} size="md" />
            <span className="text-sm">{fmtTime(a.createdAt)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{a.title}</h1>
          <p className="text-base">
            <Link href={`/medical/patients/${p.id}`} className="font-semibold text-ink hover:underline">
              {p.name}
            </Link>{" "}
            {p.age}세 {p.sex}, {p.diagnosis}, D+{daysSince(p.transplantDate)}, 다음 외래 {p.nextVisit}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.status === "new" && (
            <Button variant="ghost" onClick={() => setStatus(a.id, "acknowledged")}>
              확인함
            </Button>
          )}
          {a.status !== "done" && <Button onClick={() => setStatus(a.id, "done")}>처리 완료</Button>}
          {a.status === "done" && (
            <Button variant="ghost" onClick={() => setStatus(a.id, "acknowledged")}>
              다시 열기
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <p className="mb-2 text-sm font-bold">SBAR 요약</p>
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["S 상황", a.sbar.situation],
                  ["B 배경", a.sbar.background],
                  ["A 평가", a.sbar.assessment],
                  ["R 제안", a.sbar.recommendation],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="font-bold text-gray-900">{k}</dt>
                  <dd className="leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {a.assessment.axes.length > 0 && (
            <Card>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-ink-mute">AI 판단</span>
                <span className="text-ink-mute">증상만</span>
                <RiskBadge level={a.assessment.symptomOnlyLevel} />
                <span className="text-ink-mute">→ 검사 결합</span>
                <RiskBadge level={a.assessment.level} />
              </div>
              <p className="text-sm font-semibold">{a.assessment.headline}</p>
              {a.assessment.whyChanged !== "동일" && <p className="mt-1 text-sm">{a.assessment.whyChanged}</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {a.assessment.axes.map((ax) => (
                  <div key={ax.name} className="rounded-md bg-gray-50 p-3">
                    <p className="text-sm font-bold">
                      {ax.name}{" "}
                      <span className={`text-xs ${ax.risk === "높음" ? "text-risk-red" : ax.risk === "중간" ? "text-risk-yellow" : "text-risk-green"}`}>{ax.risk}</span>
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm leading-relaxed">
                      {ax.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {a.kgPaths && a.kgPaths.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-bold">지식그래프 경로</p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {a.kgPaths.map((pth, i) => (
                      <li key={i}>{pth}</li>
                    ))}
                  </ul>
                </div>
              )}
              {a.contextTitles && a.contextTitles.length > 0 && (
                <p className="mt-3 text-sm">검색된 근거: {a.contextTitles.join(", ")}</p>
              )}
              {a.assessment.labSignals.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-bold">판단에 쓴 검사 신호</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {a.assessment.labSignals.map((s, i) => (
                      <li key={i} className="rounded-full border border-line bg-card px-2.5 py-1 text-xs">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card>
            <p className="mb-2 text-sm font-bold">환자 대화 원문</p>
            <ul className="space-y-2">
              {a.transcript.map((t, i) => (
                <li key={i} className={`flex ${t.role === "patient" ? "justify-start" : "justify-end"}`}>
                  <p className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${t.role === "patient" ? "bg-gray-100" : "border border-line bg-card text-ink-soft"}`}>
                    <span className="mr-1 text-[10px] font-bold text-ink-mute">{t.role === "patient" ? "환자" : "앱"}</span>
                    {t.text}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="mb-2 text-sm font-bold">환자에게 전달된 안내</p>
            <p className="text-sm font-semibold">{LEVEL_LABEL[a.level]}</p>
            <p className="mt-1 text-sm leading-relaxed">{a.patientMessage}</p>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-sm font-bold">검사 추세</p>
            <div className="space-y-2">
              {ebv.some((x) => x.value > 0) && <LabTrend title="EBV RQ-PCR" points={ebv} unit="copies/mL" threshold={10000} thresholdLabel="선제치료 고려 10,000" />}
              {cmv.some((x) => x.value > 0) && <LabTrend title="CMV RQ-PCR" points={cmv} unit="IU/mL" threshold={1000} thresholdLabel="선제치료 1,000" />}
              {bil.length > 0 && p.id === "p3" && <LabTrend title="총 빌리루빈" points={bil} unit="mg/dL" threshold={1.2} thresholdLabel="상한 1.2" />}
              {taccro.length > 0 && p.id === "p3" && <LabTrend title="Tacrolimus trough" points={taccro} unit="ng/mL" threshold={5} thresholdLabel="목표 하한 5" />}
            </div>
            <Link href={`/medical/patients/${p.id}`} className="mt-3 block text-xs font-semibold text-brand hover:underline">
              전체 검사 보기
            </Link>
          </Card>

          <Card>
            <p className="mb-2 text-sm font-bold">현재 약</p>
            <ul className="space-y-1 text-sm">
              {p.medications.map((m) => (
                <li key={m.name}>
                  <span className="font-semibold">{m.name}</span> {m.dose}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <p className="mb-2 text-sm font-bold">처리 메모</p>
            <textarea
              defaultValue={notes[a.id] ?? ""}
              onBlur={(e) => setNote(a.id, e.target.value)}
              rows={4}
              placeholder="전화 내용, 외래 변경, 처방 조정 등을 기록"
              className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["전화 완료, 증상 설명함", "외래 앞당김", "응급실 내원 안내", "처방 조정 요청"].map((t) => (
                <button key={t} onClick={() => setNote(a.id, (notes[a.id] ? notes[a.id] + "\n" : "") + t)} className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft hover:border-brand hover:text-brand">
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
