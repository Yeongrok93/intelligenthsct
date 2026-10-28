import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-12">
      <p className="text-sm font-semibold tracking-wide text-brand">조혈모세포이식 센터</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
        환자가 말하면, AI가 검사 데이터와 함께 읽고,
        <br />
        전문간호사에게 먼저 알립니다
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft">
        동종조혈모세포이식 후 1년은 면역이 재건되는 시기입니다. 환자가 표현하기 어려운 증상을 음성으로 말하면 AI가 요약하고, 본원의 최근
        검사 결과와 이식 경과를 결합해 위험도를 분류한 뒤 담당 의료진에게 알립니다.
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
          <p className="mt-1 text-sm text-ink-soft">증상 말하기, 피부 사진, 식단 확인, 타원 처방약 확인, 일상생활 상담</p>
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

      <div className="mt-10 rounded-2xl border border-dashed border-line p-5 text-sm text-ink-soft">
        <p className="font-semibold text-ink">판단 파이프라인</p>
        <p className="mt-2 leading-relaxed">
          음성 입력 → 증상 추출 → 추가 질문 → 검사 데이터 결합 → 위험도 평가 → 안내문 생성 → 의료진 알림. LangGraph로 구성했고 각 단계의
          판단 근거를 환자와 의료진 화면에서 모두 볼 수 있습니다.
        </p>
        <p className="mt-3 text-xs text-ink-mute">이 프로토타입의 환자와 검사 결과는 모두 가상의 예시입니다.</p>
      </div>
    </main>
  );
}
