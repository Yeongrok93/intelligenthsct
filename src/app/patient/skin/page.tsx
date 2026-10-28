"use client";
import { useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import PhotoInput from "@/components/PhotoInput";
import { Button, Card, LevelBanner, Spinner } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";
import { addAlert } from "@/lib/alertsStore";
import type { RiskLevel } from "@/data/patients";

type Res = {
  findings: string[];
  likely: { name: string; likelihood: string; why: string }[];
  bsaEstimate: string;
  level: RiskLevel;
  patientMessage: string;
  careTips: string[];
  staffNote: string;
  alertTitle: string;
};

export default function SkinPage() {
  const { patient } = usePatient();
  const [image, setImage] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!image) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/skin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, image, description: desc }) });
      const data = (await r.json()) as Res & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "오류");
      setRes(data);
      if (data.level !== "green") {
        addAlert({
          id: `skin-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          level: data.level,
          title: data.alertTitle,
          createdAt: new Date().toISOString(),
          status: "new",
          chiefComplaint: `피부 사진: ${desc || data.findings[0] || "병변 확인 요청"}`,
          sbar: { situation: data.findings.join(". "), background: `체표면적 ${data.bsaEstimate}`, assessment: data.likely.map((l) => `${l.name} ${l.likelihood}`).join(", "), recommendation: data.staffNote },
          assessment: { level: data.level, headline: data.alertTitle, axes: [], labSignals: [], symptomOnlyLevel: data.level, whyChanged: "동일" },
          symptoms: { chiefComplaint: "피부 병변", location: "사진 참조", character: data.findings.join(", "), onset: desc || "불명확", severity: 5, trend: "불명확", fever: "불명확", associated: [], redFlags: [], concepts: ["피부 병변"], followUpQuestions: [] },
          transcript: [{ role: "patient", text: desc || "피부 사진 전송" }],
          patientMessage: data.patientMessage,
          patientActions: data.careTips,
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
      <PatientHeader title="피부 사진 확인" sub="발진이 생기거나 번질 때 찍어서 보내주세요" />
      <PhotoInput value={image} onChange={(v) => { setImage(v); setRes(null); }} label="피부 사진 찍기" />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="언제부터 생겼는지, 가려운지, 어제보다 번졌는지 적어주세요"
        rows={2}
        className="mt-3 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <Button onClick={submit} disabled={!image || busy} className="mt-3 w-full">
        {busy ? <Spinner label="사진을 살펴보는 중" /> : "확인 요청"}
      </Button>
      {err && <p className="mt-2 text-sm text-risk-red">{err}</p>}

      {res && (
        <div className="mt-4 space-y-3">
          <LevelBanner level={res.level}>
            <p className="mt-3 text-sm leading-relaxed text-ink">{res.patientMessage}</p>
          </LevelBanner>
          <Card>
            <p className="mb-1 text-xs font-semibold text-ink-mute">사진에서 보인 것</p>
            <ul className="space-y-1 text-sm">
              {res.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-mute">범위 추정: {res.bsaEstimate}</p>
          </Card>
          <Card>
            <p className="mb-1 text-xs font-semibold text-ink-mute">가능성</p>
            <ul className="space-y-1.5">
              {res.likely.map((l) => (
                <li key={l.name} className="text-sm">
                  <span className="font-semibold">{l.name}</span> <span className="text-ink-mute">{l.likelihood}</span>
                  <p className="text-xs text-ink-soft">{l.why}</p>
                </li>
              ))}
            </ul>
          </Card>
          {res.careTips.length > 0 && (
            <Card>
              <p className="mb-1 text-xs font-semibold text-ink-mute">관리 방법</p>
              <ul className="space-y-1 text-sm">
                {res.careTips.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {res.level !== "green" && (
            <Card className="bg-brand-soft">
              <p className="text-sm font-semibold text-brand-deep">{patient.nurse}에게 사진과 소견을 보냈습니다</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
