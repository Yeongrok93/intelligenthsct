// 가짜 환자 데이터. 경진대회 프로토타입용이며 실제 환자 정보가 아닙니다.

export type RiskLevel = "red" | "yellow" | "green";

export type LabResult = {
  date: string;
  category: "CBC" | "Chemistry" | "Virus" | "Culture" | "Immunosuppressant";
  items: { name: string; value: string; unit?: string; ref?: string; flag?: "H" | "L" | "N" }[];
  note?: string;
};

export type Medication = {
  name: string;
  dose: string;
  purpose: string;
};

export type VisitNote = {
  date: string;
  type: "외래" | "전화" | "입원";
  summary: string;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  sex: "남" | "여";
  diagnosis: string;
  transplantDate: string;
  transplantType: string;
  donor: string;
  conditioning: string;
  gvhdProphylaxis: string;
  currentIssues: string[];
  medications: Medication[];
  labs: LabResult[];
  visits: VisitNote[];
  nextVisit: string;
  nurse: string;
};

export const TODAY = "2026-10-28";

export function daysSince(dateStr: string, today = TODAY) {
  const a = new Date(dateStr + "T00:00:00");
  const b = new Date(today + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export const patients: Patient[] = [
  {
    id: "p1",
    name: "김하늘",
    age: 48,
    sex: "남",
    diagnosis: "급성골수성백혈병",
    transplantDate: "2026-09-08",
    transplantType: "동종 말초혈 조혈모세포이식",
    donor: "비혈연 HLA 8/8 일치",
    conditioning: "Bu/Flu 감량강도",
    gvhdProphylaxis: "Tacrolimus + MTX, ATG 사용",
    currentIssues: ["EBV viremia 상승 추세 관찰 중", "경도 구강건조"],
    medications: [
      { name: "Tacrolimus", dose: "1.5mg 1일 2회", purpose: "면역억제제" },
      { name: "Acyclovir", dose: "400mg 1일 2회", purpose: "바이러스 예방" },
      { name: "Posaconazole", dose: "300mg 1일 1회", purpose: "진균 예방" },
      { name: "Bactrim", dose: "1정 주 3회", purpose: "폐포자충 예방" },
      { name: "Ursodeoxycholic acid", dose: "300mg 1일 2회", purpose: "간 보호" },
    ],
    labs: [
      {
        date: "2026-10-27",
        category: "CBC",
        items: [
          { name: "WBC", value: "3.1", unit: "x10^3/uL", ref: "4.0-10.0", flag: "L" },
          { name: "ANC", value: "1800", unit: "/uL", ref: ">1500", flag: "N" },
          { name: "Hb", value: "10.2", unit: "g/dL", ref: "13-17", flag: "L" },
          { name: "PLT", value: "92", unit: "x10^3/uL", ref: "150-400", flag: "L" },
          { name: "Lymphocyte", value: "0.6", unit: "x10^3/uL", ref: "1.0-4.0", flag: "L" },
        ],
      },
      {
        date: "2026-10-27",
        category: "Chemistry",
        items: [
          { name: "CRP", value: "1.8", unit: "mg/dL", ref: "<0.5", flag: "H" },
          { name: "LDH", value: "412", unit: "IU/L", ref: "120-250", flag: "H" },
          { name: "Creatinine", value: "1.1", unit: "mg/dL", ref: "0.7-1.3", flag: "N" },
          { name: "AST", value: "32", unit: "IU/L", ref: "<40", flag: "N" },
          { name: "ALT", value: "41", unit: "IU/L", ref: "<40", flag: "H" },
          { name: "T.bil", value: "0.8", unit: "mg/dL", ref: "<1.2", flag: "N" },
        ],
        note: "LDH가 지난 2주간 상승 추세",
      },
      {
        date: "2026-10-27",
        category: "Virus",
        items: [
          { name: "EBV RQ-PCR", value: "18,500", unit: "copies/mL", ref: "미검출", flag: "H" },
          { name: "CMV RQ-PCR", value: "미검출", unit: "IU/mL", ref: "미검출", flag: "N" },
        ],
        note: "EBV 10/13 1,200에서 10/20 4,800, 10/27 18,500으로 2주 연속 상승. 전처치에 ATG 사용",
      },
      {
        date: "2026-10-20",
        category: "Virus",
        items: [
          { name: "EBV RQ-PCR", value: "4,800", unit: "copies/mL", ref: "미검출", flag: "H" },
          { name: "CMV RQ-PCR", value: "미검출", unit: "IU/mL", flag: "N" },
        ],
      },
      {
        date: "2026-10-13",
        category: "Virus",
        items: [
          { name: "EBV RQ-PCR", value: "1,200", unit: "copies/mL", ref: "미검출", flag: "H" },
          { name: "CMV RQ-PCR", value: "미검출", unit: "IU/mL", flag: "N" },
        ],
      },
      {
        date: "2026-10-27",
        category: "Immunosuppressant",
        items: [{ name: "Tacrolimus trough", value: "8.2", unit: "ng/mL", ref: "5-10", flag: "N" }],
      },
      {
        date: "2026-10-20",
        category: "Culture",
        items: [{ name: "Blood culture", value: "음성", ref: "음성", flag: "N" }],
      },
    ],
    visits: [
      { date: "2026-10-27", type: "외래", summary: "전신 상태 양호. EBV PCR 상승 지속으로 다음 주 재검 예정. 림프절 촉지 소견 없음. 이식후 D+49" },
      { date: "2026-10-20", type: "외래", summary: "EBV 4,800 확인. 증상 없어 추적 관찰. 구강건조 호소하여 인공타액 처방" },
      { date: "2026-10-13", type: "외래", summary: "EBV 1,200 첫 검출. 생착 양호. 외래 2주 간격 유지" },
    ],
    nextVisit: "2026-11-03",
    nurse: "강영아 전문간호사",
  },
  {
    id: "p2",
    name: "박서연",
    age: 35,
    sex: "여",
    diagnosis: "급성림프모구백혈병",
    transplantDate: "2026-06-30",
    transplantType: "동종 말초혈 조혈모세포이식",
    donor: "형제 HLA 완전일치",
    conditioning: "TBI/Cy 골수제거",
    gvhdProphylaxis: "Cyclosporine + MTX",
    currentIssues: ["CMV 저농도 viremia 추적 관찰 중", "GVHD 징후 없음"],
    medications: [
      { name: "Cyclosporine", dose: "75mg 1일 2회", purpose: "면역억제제, 감량 중" },
      { name: "Acyclovir", dose: "400mg 1일 2회", purpose: "바이러스 예방" },
      { name: "Fluconazole", dose: "200mg 1일 1회", purpose: "진균 예방" },
      { name: "Bactrim", dose: "1정 주 3회", purpose: "폐포자충 예방" },
      { name: "Magnesium oxide", dose: "500mg 1일 2회", purpose: "저마그네슘 보충" },
    ],
    labs: [
      {
        date: "2026-10-27",
        category: "CBC",
        items: [
          { name: "WBC", value: "4.6", unit: "x10^3/uL", ref: "4.0-10.0", flag: "N" },
          { name: "ANC", value: "2900", unit: "/uL", ref: ">1500", flag: "N" },
          { name: "Hb", value: "11.8", unit: "g/dL", ref: "12-16", flag: "L" },
          { name: "PLT", value: "168", unit: "x10^3/uL", ref: "150-400", flag: "N" },
          { name: "Lymphocyte", value: "1.1", unit: "x10^3/uL", ref: "1.0-4.0", flag: "N" },
        ],
      },
      {
        date: "2026-10-27",
        category: "Chemistry",
        items: [
          { name: "CRP", value: "0.2", unit: "mg/dL", ref: "<0.5", flag: "N" },
          { name: "Creatinine", value: "0.9", unit: "mg/dL", ref: "0.5-1.0", flag: "N" },
          { name: "AST", value: "25", unit: "IU/L", ref: "<40", flag: "N" },
          { name: "ALT", value: "22", unit: "IU/L", ref: "<40", flag: "N" },
          { name: "Mg", value: "1.6", unit: "mg/dL", ref: "1.8-2.4", flag: "L" },
        ],
      },
      {
        date: "2026-10-27",
        category: "Virus",
        items: [
          { name: "CMV RQ-PCR", value: "420", unit: "IU/mL", ref: "미검출", flag: "H" },
          { name: "EBV RQ-PCR", value: "미검출", unit: "copies/mL", flag: "N" },
        ],
        note: "CMV 저농도 양성. 선제치료 기준인 1,000 IU/mL 미만이며 증상 없음. 추적 관찰 대상. 결과는 외래 다음날 앱에 공개됨",
      },
      {
        date: "2026-10-13",
        category: "Virus",
        items: [
          { name: "CMV RQ-PCR", value: "310", unit: "IU/mL", ref: "미검출", flag: "H" },
          { name: "EBV RQ-PCR", value: "미검출", unit: "copies/mL", flag: "N" },
        ],
      },
      {
        date: "2026-10-27",
        category: "Immunosuppressant",
        items: [{ name: "Cyclosporine trough", value: "112", unit: "ng/mL", ref: "100-200", flag: "N" }],
      },
    ],
    visits: [
      { date: "2026-10-27", type: "외래", summary: "무증상. CMV 420으로 지난 검사 대비 소폭 상승이나 치료 기준 미만. 2주 후 재검. cyclosporine 감량 계속. 이식후 D+119" },
      { date: "2026-10-14", type: "전화", summary: "앱에서 CMV 양성 결과 확인 후 불안하여 전화. 치료 기준 미만임을 설명" },
      { date: "2026-10-13", type: "외래", summary: "CMV 310 첫 검출. 증상 없음. 추적 관찰" },
    ],
    nextVisit: "2026-11-10",
    nurse: "강영아 전문간호사",
  },
  {
    id: "p3",
    name: "이준호",
    age: 56,
    sex: "남",
    diagnosis: "골수형성이상증후군",
    transplantDate: "2026-07-30",
    transplantType: "동종 말초혈 조혈모세포이식",
    donor: "반일치 자녀 공여",
    conditioning: "Flu/Bu/ATG 감량강도",
    gvhdProphylaxis: "Post-transplant cyclophosphamide + Tacrolimus + MMF",
    currentIssues: ["급성 피부 GVHD 2단계, 스테로이드 감량 중", "간헐적 설사"],
    medications: [
      { name: "Tacrolimus", dose: "2mg 1일 2회", purpose: "면역억제제" },
      { name: "Prednisolone", dose: "20mg 1일 1회", purpose: "GVHD 치료, 감량 중" },
      { name: "Mycophenolate", dose: "500mg 1일 2회", purpose: "면역억제제" },
      { name: "Valganciclovir", dose: "450mg 1일 1회", purpose: "CMV 예방" },
      { name: "Posaconazole", dose: "300mg 1일 1회", purpose: "진균 예방" },
      { name: "Bactrim", dose: "1정 주 3회", purpose: "폐포자충 예방" },
      { name: "Pantoprazole", dose: "40mg 1일 1회", purpose: "위 보호" },
    ],
    labs: [
      {
        date: "2026-10-26",
        category: "CBC",
        items: [
          { name: "WBC", value: "5.8", unit: "x10^3/uL", ref: "4.0-10.0", flag: "N" },
          { name: "ANC", value: "4100", unit: "/uL", ref: ">1500", flag: "N" },
          { name: "Hb", value: "9.6", unit: "g/dL", ref: "13-17", flag: "L" },
          { name: "PLT", value: "74", unit: "x10^3/uL", ref: "150-400", flag: "L" },
          { name: "Eosinophil", value: "0.7", unit: "x10^3/uL", ref: "<0.5", flag: "H" },
        ],
      },
      {
        date: "2026-10-26",
        category: "Chemistry",
        items: [
          { name: "CRP", value: "0.9", unit: "mg/dL", ref: "<0.5", flag: "H" },
          { name: "Creatinine", value: "1.3", unit: "mg/dL", ref: "0.7-1.3", flag: "N" },
          { name: "AST", value: "58", unit: "IU/L", ref: "<40", flag: "H" },
          { name: "ALT", value: "72", unit: "IU/L", ref: "<40", flag: "H" },
          { name: "T.bil", value: "1.6", unit: "mg/dL", ref: "<1.2", flag: "H" },
          { name: "Albumin", value: "3.1", unit: "g/dL", ref: "3.5-5.2", flag: "L" },
          { name: "K", value: "3.4", unit: "mmol/L", ref: "3.5-5.1", flag: "L" },
        ],
        note: "AST, ALT, 빌리루빈이 지난 외래보다 상승. 간 GVHD 가능성 염두",
      },
      {
        date: "2026-10-26",
        category: "Virus",
        items: [
          { name: "CMV RQ-PCR", value: "미검출", unit: "IU/mL", flag: "N" },
          { name: "EBV RQ-PCR", value: "미검출", unit: "copies/mL", flag: "N" },
        ],
      },
      {
        date: "2026-10-26",
        category: "Immunosuppressant",
        items: [{ name: "Tacrolimus trough", value: "4.1", unit: "ng/mL", ref: "5-10", flag: "L" }],
        note: "목표 농도 미달. 복약 순응도 확인 필요",
      },
      {
        date: "2026-10-26",
        category: "Culture",
        items: [
          { name: "Stool culture", value: "음성", ref: "음성", flag: "N" },
          { name: "C.difficile toxin", value: "음성", flag: "N" },
        ],
      },
    ],
    visits: [
      { date: "2026-10-26", type: "외래", summary: "피부 GVHD 체표면적 약 30%, 2단계. 프레드니솔론 25mg에서 20mg으로 감량. 설사 하루 2회. 간수치 상승 추세로 다음 외래 당겨 1주 후 재평가. 이식후 D+88" },
      { date: "2026-10-12", type: "외래", summary: "피부 발진 체표면적 20%. 스테로이드 반응 양호. 감량 시작" },
      { date: "2026-09-28", type: "입원", summary: "급성 피부 GVHD 2단계 발생으로 입원. 메틸프레드니솔론 1mg/kg 시작. 7일 후 퇴원" },
    ],
    nextVisit: "2026-11-02",
    nurse: "강영아 전문간호사",
  },
];

export function getPatient(id: string) {
  return patients.find((p) => p.id === id);
}
