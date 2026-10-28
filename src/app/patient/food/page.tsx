"use client";
import { useState } from "react";
import PatientHeader from "@/components/PatientHeader";
import PhotoInput from "@/components/PhotoInput";
import { Button, Card, Spinner } from "@/components/ui";
import { usePatient } from "@/lib/patientSelection";

type Res = {
  foods: { name: string; verdict: "가능" | "조건부" | "피하기"; reason: string }[];
  overall: "가능" | "조건부" | "피하기";
  patientMessage: string;
  immuneContext: string;
};

const V: Record<Res["overall"], { bg: string; fg: string; emoji: string }> = {
  가능: { bg: "bg-risk-green-soft", fg: "text-risk-green", emoji: "🟢" },
  조건부: { bg: "bg-risk-yellow-soft", fg: "text-risk-yellow", emoji: "🟡" },
  피하기: { bg: "bg-risk-red-soft", fg: "text-risk-red", emoji: "🔴" },
};

export default function FoodPage() {
  const { patient } = usePatient();
  const [image, setImage] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!image && !desc.trim()) return;
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/food", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, image, description: desc }) });
      const data = (await r.json()) as Res & { error?: string };
      if (!r.ok) throw new Error(data.error ?? "오류");
      setRes(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PatientHeader title="이 음식 먹어도 될까요" sub="오늘의 면역 상태에 맞춰 알려드립니다" />
      <PhotoInput value={image} onChange={(v) => { setImage(v); setRes(null); }} label="음식 사진 찍기" />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="사진이 없으면 글로 적어도 됩니다. 예: 회사 구내식당 비빔밥"
        className="mt-3 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
      <Button onClick={submit} disabled={(!image && !desc.trim()) || busy} className="mt-3 w-full">
        {busy ? <Spinner label="음식을 확인하는 중" /> : "확인하기"}
      </Button>
      {err && <p className="mt-2 text-sm text-risk-red">{err}</p>}

      {res && (
        <div className="mt-4 space-y-3">
          <div className={`rounded-2xl p-5 fade-up ${V[res.overall].bg}`}>
            <p className="text-2xl">{V[res.overall].emoji}</p>
            <p className={`mt-2 text-xl font-bold ${V[res.overall].fg}`}>{res.overall === "가능" ? "드셔도 됩니다" : res.overall === "조건부" ? "조건을 지키면 됩니다" : "지금은 피해주세요"}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink">{res.patientMessage}</p>
          </div>
          <Card>
            <ul className="divide-y divide-line">
              {res.foods.map((f) => (
                <li key={f.name} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="mt-0.5 text-base">{V[f.verdict].emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">
                      {f.name} <span className={`text-xs ${V[f.verdict].fg}`}>{f.verdict}</span>
                    </p>
                    <p className="text-xs leading-relaxed text-ink-soft">{f.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs leading-relaxed text-ink-soft">판단 기준: {res.immuneContext}</p>
        </div>
      )}
    </div>
  );
}
