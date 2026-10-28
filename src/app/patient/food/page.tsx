"use client";
import { useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import PhotoInput from "@/components/PhotoInput";
import { Button, Card } from "@/components/ui";
import ProgressSteps, { type Status } from "@/components/ProgressSteps";
import { readNdjson } from "@/lib/ndjson";
import { usePatient } from "@/lib/patientSelection";

type Verdict = "가능" | "조건부" | "피하기";
type Res =
  | { isFood: false; whatIsIt: string; message: string }
  | {
      isFood: true;
      whatIsIt: string;
      identified: string[];
      foods: { name: string; verdict: Verdict; reason: string; rule: string }[];
      overall: Verdict;
      recommendation: string;
      immuneContext: string;
      guidelineTitles: string[];
    };

const V: Record<Verdict, { bg: string; fg: string; emoji: string }> = {
  가능: { bg: "bg-risk-green-soft", fg: "text-risk-green", emoji: "🟢" },
  조건부: { bg: "bg-risk-yellow-soft", fg: "text-risk-yellow", emoji: "🟡" },
  피하기: { bg: "bg-risk-red-soft", fg: "text-risk-red", emoji: "🔴" },
};

export default function FoodPage() {
  const { patient } = usePatient();
  const [image, setImage] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!image && !desc.trim()) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    setStatuses([]);
    try {
      const r = await fetch("/api/food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, image, description: desc }) });
      const box: { data: Res | null } = { data: null };
      await readNdjson<{ type: string } & Partial<Status>>(r, (ev) => {
        if (ev.type === "status") setStatuses((s) => [...s, { label: ev.label ?? "", hints: ev.hints }]);
        else if (ev.type === "done") box.data = ev as unknown as Res;
      });
      if (!box.data) throw new Error("결과를 받지 못했습니다");
      const data = box.data;
      setRes(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PatientHeader title="이 음식 먹어도 될까요" sub="사진 속 음식을 먼저 알아보고, 오늘의 면역 상태와 지침에 맞춰 알려드립니다" />
      <PhotoInput value={image} onChange={(v) => { setImage(v); setRes(null); }} label="음식 사진 찍기" />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="사진이 없으면 글로 적어도 됩니다. 예: 회사 구내식당 비빔밥"
        className="mt-3 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <Button onClick={submit} disabled={(!image && !desc.trim()) || busy} className="mt-3 w-full">
        {busy ? "확인 중" : "확인하기"}
      </Button>
      {busy && (
        <div className="mt-3">
          <ProgressSteps statuses={statuses} />
        </div>
      )}
      {err && <p className="mt-2 text-sm text-risk-red">{err}</p>}

      {res && !res.isFood && (
        <div className="mt-4 rounded-2xl border-2 border-risk-yellow bg-risk-yellow-soft p-5 fade-up">
          <p className="text-xl font-bold text-risk-yellow">음식 사진을 올려주세요</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{res.message}</p>
          <p className="mt-2 text-xs text-ink-soft">사진에서 보인 것: {res.whatIsIt}</p>
        </div>
      )}

      {res && res.isFood && (
        <div className="mt-4 space-y-3">
          <Card>
            <p className="text-xs font-semibold text-ink-mute">1단계, 사진 속 음식</p>
            <p className="mt-1 text-base font-bold">{res.whatIsIt}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {res.identified.map((f) => (
                <span key={f} className="rounded-full border border-line px-2.5 py-0.5 text-xs">
                  {f}
                </span>
              ))}
            </div>
          </Card>

          <div className={`rounded-2xl p-5 fade-up ${V[res.overall].bg}`}>
            <p className="text-xs font-semibold text-ink-soft">2단계, 지침과 비교한 결과</p>
            <p className="mt-1 text-2xl">{V[res.overall].emoji}</p>
            <p className={`mt-1 text-xl font-bold ${V[res.overall].fg}`}>
              {res.overall === "가능" ? "드셔도 됩니다" : res.overall === "조건부" ? "조건을 지키면 됩니다" : "지금은 피해주세요"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink">{res.recommendation}</p>
          </div>

          <Card>
            <ul className="divide-y divide-line">
              {res.foods.map((f) => (
                <li key={f.name} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="mt-0.5 text-base">{V[f.verdict].emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">
                      {f.name} <span className={`text-xs ${V[f.verdict].fg}`}>{f.verdict}</span>
                    </p>
                    <p className="text-xs leading-relaxed text-ink-soft">{f.reason}</p>
                    <p className="mt-0.5 text-[11px] text-ink-mute">지침: {f.rule}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <p className="rounded-xl bg-gray-100 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            판단 기준: {res.immuneContext}
            {res.guidelineTitles.length > 0 && <span className="block text-ink-mute">참고한 지침: {res.guidelineTitles.join(", ")}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
