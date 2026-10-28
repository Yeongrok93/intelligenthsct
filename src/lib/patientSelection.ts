"use client";
import { useCallback, useEffect, useState } from "react";
import { patients, daysSince, type Patient } from "@/data/patients";

const KEY = "hsct-care-patient-id";

export function usePatient() {
  const [id, setId] = useState<string>("p1");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && patients.some((p) => p.id === saved)) setId(saved);
    } catch {}
    setReady(true);
  }, []);
  const select = useCallback((next: string) => {
    setId(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }, []);
  const patient: Patient = patients.find((p) => p.id === id) ?? patients[0];
  return { patient, patients, select, ready, dplus: daysSince(patient.transplantDate) };
}
