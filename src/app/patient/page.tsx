"use client";
import Link from "next/link";
import PatientHeader from "@/components/PatientHeader";
import { Card, RiskBadge, SectionTitle, fmtTime } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";
import { useAlerts } from "@/lib/alertsStore";
import { daysSince, TODAY } from "@/data/patients";

export default function PatientHome() {
  const { patient, dplus } = usePatient();
  const { alerts } = useAlerts();
  const mine = alerts.filter((a) => a.patientId === patient.id).slice(0, 3);
  const latestVirus = patient.labs.filter((l) => l.category === "Virus").sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const latestCbc = patient.labs.find((l) => l.category === "CBC");
  const anc = latestCbc?.items.find((i) => i.name === "ANC");
  const plt = latestCbc?.items.find((i) => i.name === "PLT");
  const untilVisit = daysSince(TODAY, patient.nextVisit);

  return (
    <div>
      <PatientHeader title={`${patient.name}님, 안녕하세요`} sub={`${patient.transplantDate} 이식, 오늘은 ${TODAY}`} />

      <div className="rounded-3xl bg-brand p-5 text-white shadow-md">
        <p className="text-sm opacity-80">이식 후</p>
        <p className="text-4xl font-bold leading-none">
          D+{dplus}
          <span className="ml-2 text-base font-semibold opacity-80">일째</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed opacity-90">
          {dplus < 100 ? "면역이 가장 낮은 시기입니다. 작은 변화도 말씀해 주세요." : "면역이 조금씩 돌아오는 시기입니다. 꾸준한 관리가 중요합니다."}
        </p>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 text-sm">
          <span>다음 외래 {patient.nextVisit}</span>
          <span className="font-semibold">{untilVisit}일 남음</span>
        </div>
      </div>

      <Link href="/patient/symptom" className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4 transition hover:bg-teal-100">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
          </svg>
        </span>
        <span>
          <span className="block text-base font-bold text-brand-deep">불편한 곳이 있으면 말씀해 주세요</span>
          <span className="block text-xs text-ink-soft">말로 설명하면 AI가 정리하고 필요하면 담당 간호사에게 알립니다</span>
        </span>
      </Link>

      <div className="mt-5">
        <SectionTitle sub="본원 검사 결과를 쉬운 말로 풀어드립니다">최근 검사</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <p className="text-xs text-ink-mute">호중구 ANC</p>
            <p className="text-lg font-bold">{anc?.value}</p>
            <p className="text-xs text-ink-soft">{Number(anc?.value) >= 1500 ? "감염 방어력 정상 범위" : "감염 주의 범위"}</p>
          </Card>
          <Card>
            <p className="text-xs text-ink-mute">혈소판 PLT</p>
            <p className="text-lg font-bold">{plt?.value}</p>
            <p className="text-xs text-ink-soft">{Number(plt?.value) >= 50 ? "일상생활 가능" : "부딪힘 주의"}</p>
          </Card>
        </div>
        {latestVirus && (
          <Card className="mt-2">
            <p className="text-xs text-ink-mute">바이러스 검사 {latestVirus.date}</p>
            <ul className="mt-1 space-y-1">
              {latestVirus.items.map((i) => (
                <li key={i.name} className="flex items-center justify-between text-sm">
                  <span>{i.name.replace(" RQ-PCR", "")}</span>
                  <span className={`font-semibold ${i.flag === "H" ? "text-risk-yellow" : "text-risk-green"}`}>
                    {i.value} {i.unit}
                  </span>
                </li>
              ))}
            </ul>
            {latestVirus.note && <p className="mt-2 rounded-xl bg-stone-50 px-3 py-2 text-xs leading-relaxed text-ink-soft">{explainNote(latestVirus.note)}</p>}
          </Card>
        )}
      </div>

      <div className="mt-5">
        <SectionTitle>최근 상담 기록</SectionTitle>
        {mine.length === 0 ? (
          <p className="text-sm text-ink-mute">아직 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((a) => (
              <li key={a.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-ink-mute">{fmtTime(a.createdAt)}</p>
                  </div>
                  <RiskBadge level={a.level} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          { href: "/patient/skin", t: "피부 사진 확인", d: "발진이 생기면 찍어서 보내기" },
          { href: "/patient/food", t: "이 음식 먹어도 될까", d: "사진으로 바로 확인" },
          { href: "/patient/meds", t: "다른 병원 약 확인", d: "본원 약과 상호작용" },
          { href: "/patient/chat", t: "일상생활 상담", d: "운동, 복직, 여행, 접종" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="rounded-2xl border border-line bg-card p-3 transition hover:bg-stone-50">
            <p className="text-sm font-bold">{x.t}</p>
            <p className="mt-0.5 text-xs text-ink-mute">{x.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function explainNote(note: string) {
  if (note.includes("CMV 저농도")) return "CMV 수치가 약하게 나왔지만 치료를 시작하는 기준보다 낮습니다. 열이나 설사가 없다면 예정대로 재검하면 됩니다.";
  if (note.includes("EBV")) return "EBV 수치가 오르고 있어 의료진이 가깝게 지켜보고 있습니다. 목이나 턱밑에 만져지는 것이 생기거나 열이 나면 바로 말씀해 주세요.";
  return note;
}
