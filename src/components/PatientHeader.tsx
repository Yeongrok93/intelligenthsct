"use client";
import { usePatient } from "@/lib/patientSelection";
import ViewSwitch from "@/components/ViewSwitch";

export default function PatientHeader({ title, sub }: { title: string; sub?: string }) {
  const { patient, patients, select, dplus } = usePatient();
  return (
    <header className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <ViewSwitch current="patient" />
        <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white py-1 pl-3 pr-2 text-xs">
          <span className="font-semibold text-brand">D+{dplus}</span>
          <select value={patient.id} onChange={(e) => select(e.target.value)} className="bg-transparent text-xs font-semibold outline-none">
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      {sub && <p className="mt-0.5 text-xs text-ink-mute">{sub}</p>}
    </header>
  );
}
