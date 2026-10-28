"use client";
import { useCallback, useEffect, useState } from "react";
import { patients, daysSince, type Patient } from "@/data/patients";

const KEY = "hsct-care-patient-id";
const EVENT = "patient-changed";

function readId() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && patients.some((p) => p.id === saved)) return saved;
  } catch {}
  return "p1";
}

export function usePatient() {
  const [id, setId] = useState<string>("p1");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setId(readId());
    setReady(true);
    // 다른 컴포넌트에서 환자를 바꾸면 같이 갱신한다
    const onChange = () => setId(readId());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const select = useCallback((next: string) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setId(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const patient: Patient = patients.find((p) => p.id === id) ?? patients[0];
  return { patient, patients, select, ready, dplus: daysSince(patient.transplantDate) };
}
