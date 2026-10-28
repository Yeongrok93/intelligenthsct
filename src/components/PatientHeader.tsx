"use client";
import Link from "next/link";
import { usePatient } from "@/lib/patientSelection";

export default function PatientHeader({ title, sub }: { title: string; sub?: string }) {
  const { patient, patients, select, dplus } = usePatient();
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {sub && <p className="mt-0.5 text-xs text-ink-mute">{sub}</p>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <label className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-3 pr-2 text-xs">
          <span className="font-semibold text-brand">D+{dplus}</span>
          <select value={patient.id} onChange={(e) => select(e.target.value)} className="bg-transparent text-xs font-semibold outline-none">
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Link href="/medical" className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white">
          의료진 화면으로
        </Link>
      </div>
    </header>
  );
}
