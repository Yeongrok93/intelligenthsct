# 이식 후 돌봄 AI

동종조혈모세포이식 후 환자의 증상을 음성으로 듣고, 본원의 최근 검사 결과와 이식 경과를 결합해 위험도를 분류하고 담당 의료진에게 알리는 프로토타입입니다. AI 업무개선 아이디어 경진대회 제출용이며 환자와 검사 결과는 모두 가상의 예시입니다.

## 화면

- `/patient` 환자 웹앱. 증상 말하기, 피부 사진 확인, 식단 확인, 타원 처방약과 검진 결과 확인, 일상생활 상담
- `/medical` 의료진 웹. 위험도순 알림 큐, SBAR 요약, 검사 추세, 환자 기록, 지식그래프, 알림 재생 버튼

## 판단 파이프라인

LangGraph로 구성했습니다. `src/lib/graph/triage.ts`

1. 증상 추출. 환자의 구두 설명을 구조화하고 꼭 필요한 정보가 빠졌으면 최대 2개 되묻습니다
2. 검사 데이터 결합. 지식그래프로 검색어를 넓힌 뒤 환자의 검사 기록과 지침을 벡터 검색합니다
3. 위험도 평가. 감염, GVHD, PTLD, 기타 축으로 근거를 정리하고 등급을 정합니다. 증상만으로 판단한 등급과 검사를 결합한 등급을 함께 냅니다
4. 안내문 생성. 환자용 안내와 의료진용 SBAR
5. 의료진 알림

등급은 🔴 응급실을 방문해주세요, 🟡 의료진에게 전화로 확인해주세요, 🟢 지금처럼 자가관리 잘해주세요 세 단계입니다.

## 지식

- `src/data/patients.ts` 가짜 환자 3명과 검사, 진료 기록
- `src/data/guidelines.ts`, `src/data/guidelinesExtra.ts` 요약 지침과 보충 지침
- `guideline/` 기관 원본 문서. 공개 저장소에는 올리지 않습니다
- `src/data/index.json` 사전 계산한 임베딩. `npm run build:knowledge`로 생성
- `src/data/kg.json` Claude가 지침에서 추출한 지식그래프. 같은 스크립트로 생성

LLM에는 제공된 기록과 지침, 문헌에 없는 사실을 만들지 않도록 규칙을 넣었고, 일상생활 상담은 지침에 근거가 없으면 PubMed를 검색해 인용합니다.

## 지침의 출처

요약 지침 25개에는 각각 출처가 붙어 있습니다. `src/data/sources.ts`에 정리했고 `/medical/sources`에서 볼 수 있습니다. 문헌 출처 19편의 PMID는 PubMed에서 확인했습니다. 주요 출처는 Tomblyn 2009 감염 예방 지침, MAGIC 급성 GVHD 병기, NIH 2014 만성 GVHD 합의, ECIL EBV와 CMV와 예방접종 지침, IDSA 호중구감소 발열 지침, Majhail 2012 장기 생존자 권고 등입니다. 지침 본문은 출처를 요약한 교육용 문장이며, EBV와 CMV 선제치료 기준값 같은 구체적 수치는 기관 프로토콜에 맞게 바꿔야 합니다.

## 실행

```
npm install
```

`.env.local`에 다음을 넣습니다.

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

```
npm run build:knowledge   # index.json, kg.json 생성. 최초 1회
npm run dev
```

이미지 기반 PDF를 텍스트로 옮기려면 `guideline/extracted/pages/`에 페이지 이미지를 두고 `npm run transcribe:pdf`를 실행합니다.

## 배포

Vercel에 올릴 때 환경변수 `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`를 설정합니다. 알림 상태는 브라우저 localStorage에 저장되므로 같은 브라우저에서 환자 화면과 의료진 화면을 함께 보면 흐름이 이어집니다. 의료진 화면의 알림 재생 버튼으로 환자 앱 없이도 알림 수신을 볼 수 있습니다.
