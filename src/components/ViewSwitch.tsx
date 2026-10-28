"use client";
// 환자 앱과 의료진 화면을 오가는 공용 전환 버튼. 두 화면에서 같은 모양으로 쓴다.
import Link from "next/link";

export default function ViewSwitch({ current }: { current: "patient" | "medical" }) {
  const base = "px-3 py-1 text-xs font-semibold transition";
  const on = "bg-gray-900 text-white";
  const off = "bg-white text-gray-600 hover:bg-gray-100";
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-gray-300">
      <Link href="/patient" className={`${base} ${current === "patient" ? on : off}`}>
        환자 앱
      </Link>
      <Link href="/medical" className={`${base} border-l border-gray-300 ${current === "medical" ? on : off}`}>
        의료진
      </Link>
    </div>
  );
}
