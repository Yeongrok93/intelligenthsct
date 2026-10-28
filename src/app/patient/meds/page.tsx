"use client";
import { useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import PhotoInput from "@/components/PhotoInput";
import { Button, Card, LevelBanner, Spinner } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";
import { addAlert } from "@/lib/alertsStore";
import type { RiskLevel } from "@/data/patients";

type Res = {
  mode: "처방약" | "검진결과";
  items: { name: string; concern: "주의" | "확인" | "문제없음"; interactsWith: string; detail: string }[];
  level: RiskLevel;
  patientMessage: string;
  staffNote: string;
};

const C = { 주의: "text-risk-red", 확인: "text-risk-yellow", 문제없음: "text-risk-green" };

const EXAMPLES = [
  "정형외과에서 허리 통증으로 아세클로페낙 100mg, 에페리손 50mg 처방받았어요",
  "피부과에서 발톱 무좀으로 이트라코나졸 100mg 처방",
  "동네 건강검진 결과 공복혈당 118, 총콜레스테롤 245, 간수치 AST 44 ALT 61 나왔어요",
];

export default function MedsPage() {
  const { patient } = usePatient();
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!input.trim() && !image) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/meds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, input, image }) });
      const data = (await r.json()) as Res & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "오류");
      setRes(data);
      if (data.level !== "green") {
        addAlert({
          id: `meds-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          level: data.level,
          title: `타원 ${data.mode} 확인 요청`,
          createdAt: new Date().toISOString(),
          status: "new",
          chiefComplaint: input || "처방전 사진",
          sbar: { situation: `환자가 타원 ${data.mode} 입력`, background: input || "사진 참조", assessment: data.items.filter((i) => i.concern !== "문제없음").map((i) => `${i.name}: ${i.detail}`).join(" "), recommendation: data.staffNote },
          assessment: { level: data.level, headline: `타원 ${data.mode} 상호작용 확인`, axes: [], labSignals: [], symptomOnlyLevel: data.level, whyChanged: "동일" },
          symptoms: { chiefComplaint: `타원 ${data.mode}`, location: "해당 없음", character: "약물 확인", onset: "오늘", severity: 0, trend: "불명확", fever: "불명확", associated: [], redFlags: [], concepts: ["타원 처방약"], followUpQuestions: [] },
          transcript: [{ role: "patient", text: input || "처방전 사진 전송" }],
          patientMessage: data.patientMessage,
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PatientHeader title="다른 병원 약과 검진 결과" sub="본원 약과 함께 먹어도 되는지 확인합니다" />
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="처방받은 약 이름과 용량, 또는 검진 결과 수치를 적어주세요"
        className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => setInput(ex)} className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-ink-soft hover:border-brand hover:text-brand">
            {ex.slice(0, 22)}…
          </button>
        ))}
      </div>
      <div className="mt-3">
        <PhotoInput value={image} onChange={setImage} label="처방전이나 결과지 사진" />
      </div>
      <Button onClick={submit} disabled={(!input.trim() && !image) || busy} className="mt-3 w-full">
        {busy ? <Spinner label="본원 약과 대조하는 중" /> : "확인하기"}
      </Button>
      {err && <p className="mt-2 text-sm text-risk-red">{err}</p>}

      <Card className="mt-4">
        <p className="mb-1 text-xs font-semibold text-ink-mute">본원에서 드시는 약</p>
        <ul className="space-y-0.5 text-xs text-ink-soft">
          {patient.medications.map((m) => (
            <li key={m.name}>
              <span className="font-semibold text-ink">{m.name}</span> {m.dose}, {m.purpose}
            </li>
          ))}
        </ul>
      </Card>

      {res && (
        <div className="mt-4 space-y-3">
          <LevelBanner level={res.level}>
            <p className="mt-3 text-sm leading-relaxed text-ink">{res.patientMessage}</p>
          </LevelBanner>
          <Card>
            <ul className="divide-y divide-line">
              {res.items.map((it) => (
                <li key={it.name} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm font-semibold">
                    {it.name} <span className={`text-xs ${C[it.concern]}`}>{it.concern}</span>
                  </p>
                  {it.interactsWith !== "없음" && <p className="text-xs text-ink-mute">관련 본원 약: {it.interactsWith}</p>}
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{it.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
          {res.level !== "green" && (
            <Card className="bg-brand-soft">
              <p className="text-sm font-semibold text-brand-deep">{patient.nurse}에게 확인 요청을 보냈습니다</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
