"use client";
// 알림 저장소. 서버 DB 없이 브라우저 localStorage에 저장하고 seedAlerts와 합친다.
import { useCallback, useEffect, useState } from "react";
import type { TriageAlert } from "@/lib/graph/triage";
import { seedAlerts } from "@/data/seedAlerts";

const KEY = "hsct-care-alerts-v1";

type Stored = { added: TriageAlert[]; status: Record<string, TriageAlert["status"]>; notes: Record<string, string> };

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {}
  return { added: [], status: {}, notes: {} };
}

function save(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function mergeAlerts(s: Stored): TriageAlert[] {
  const all = [...s.added, ...seedAlerts].map((a) => ({ ...a, status: s.status[a.id] ?? a.status }));
  return all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export function addAlert(alert: TriageAlert) {
  const s = load();
  s.added = [alert, ...s.added.filter((a) => a.id !== alert.id)];
  save(s);
  window.dispatchEvent(new Event("alerts-changed"));
}

export function useAlerts() {
  const [stored, setStored] = useState<Stored>({ added: [], status: {}, notes: {} });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStored(load());
    setReady(true);
    const onChange = () => setStored(load());
    window.addEventListener("alerts-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("alerts-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setStatus = useCallback((id: string, status: TriageAlert["status"]) => {
    const s = load();
    s.status[id] = status;
    save(s);
    setStored(s);
    window.dispatchEvent(new Event("alerts-changed"));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    const s = load();
    s.notes[id] = note;
    save(s);
    setStored(s);
  }, []);

  const reset = useCallback(() => {
    save({ added: [], status: {}, notes: {} });
    setStored({ added: [], status: {}, notes: {} });
    window.dispatchEvent(new Event("alerts-changed"));
  }, []);

  return { alerts: mergeAlerts(stored), notes: stored.notes, ready, setStatus, setNote, reset };
}
