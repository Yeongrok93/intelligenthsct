import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-12">
      <p className="text-sm font-semibold tracking-wide text-brand">조혈모세포이식 센터</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">조혈모세포이식 환자를 간호사와 AI가 함께 케어합니다</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
        동종조혈모세포이식 후 1년은 면역이 회복되는 중요한 시기입니다. 환자가 말로 전한 증상과 본원의 최근 검사 결과, 이식 경과를 AI가 함께
        요약하고 위험도를 분류해 전문간호사에게 먼저 알립니다.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/patient" className="group rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold">환자 앱</h2>
          <p className="mt-1 text-sm text-ink-soft">증상 말하기, 피부 사진, 음식 확인, 타원 처방약 확인, 일상생활 상담</p>
          <p className="mt-4 text-sm font-semibold text-brand group-hover:underline">/patient 열기</p>
        </Link>
        <Link href="/medical" className="group rounded-2xl border border-line bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-6" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold">의료진 대시보드</h2>
          <p className="mt-1 text-sm text-ink-soft">위험도순 알림 큐, SBAR 요약, 검사 추세, 환자 기록, 처리 상태 관리</p>
          <p className="mt-4 text-sm font-semibold text-brand group-hover:underline">/medical 열기</p>
        </Link>
      </div>

      <p className="mt-12 text-center text-lg font-semibold text-black">이 프로토타입의 환자와 검사 결과는 모두 가상의 예시입니다.</p>
    </main>
  );
}
