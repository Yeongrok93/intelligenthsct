"use client";
import { useRef, useState } from "react";
import { fileToDataUrl } from "@/lib/imageUtil";

export default function PhotoInput({ value, onChange, label = "사진 찍기 또는 올리기" }: { value: string | null; onChange: (dataUrl: string | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            onChange(await fileToDataUrl(f));
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-line">
          <img src={value} alt="업로드한 사진" className="max-h-72 w-full object-cover" />
          <button onClick={() => onChange(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
            다시 찍기
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          disabled={busy}
          className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h3l2-3h6l2 3h3v12H4z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          {busy ? "불러오는 중" : label}
        </button>
      )}
    </div>
  );
}
