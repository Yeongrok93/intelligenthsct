// RAG 문서 코퍼스. 환자 기록과 지침을 검색 가능한 문서로 만든다. 임베딩은 scripts/build-knowledge.mts가 미리 계산한다.
import { patients, daysSince, type Patient } from "@/data/patients";
import { guidelines } from "@/data/guidelines";
import { extraGuidelines } from "@/data/guidelinesExtra";

export type RagDoc = {
  id: string;
  patientId: string | "general";
  kind: "lab" | "visit" | "profile" | "medication" | "guideline" | "external";
  title: string;
  text: string;
  source?: string;
};

export function patientDocs(p: Patient): RagDoc[] {
  const docs: RagDoc[] = [];
  const dplus = daysSince(p.transplantDate);
  docs.push({
    id: `${p.id}-profile`,
    patientId: p.id,
    kind: "profile",
    title: `${p.name} 이식 정보`,
    text: `환자 ${p.name}, ${p.age}세 ${p.sex}. 진단 ${p.diagnosis}. ${p.transplantType}, 이식일 ${p.transplantDate}, 오늘 기준 이식후 D+${dplus}. 공여자 ${p.donor}. 전처치 ${p.conditioning}. GVHD 예방 ${p.gvhdProphylaxis}. 현재 문제: ${p.currentIssues.join(", ")}. 다음 외래 ${p.nextVisit}. 담당 ${p.nurse}.`,
  });
  docs.push({
    id: `${p.id}-meds`,
    patientId: p.id,
    kind: "medication",
    title: `${p.name} 현재 복용약`,
    text: `${p.name} 현재 복용약: ` + p.medications.map((m) => `${m.name} ${m.dose}, ${m.purpose}`).join(". "),
  });
  for (const lab of p.labs) {
    const items = lab.items
      .map((i) => `${i.name} ${i.value}${i.unit ? " " + i.unit : ""}${i.ref ? ", 참고 " + i.ref : ""}${i.flag && i.flag !== "N" ? ", " + (i.flag === "H" ? "높음" : "낮음") : ""}`)
      .join("; ");
    docs.push({
      id: `${p.id}-lab-${lab.category}-${lab.date}`,
      patientId: p.id,
      kind: "lab",
      title: `${p.name} ${lab.date} ${lab.category}`,
      text: `${p.name} ${lab.date} ${lab.category} 검사: ${items}.${lab.note ? " 비고: " + lab.note : ""}`,
    });
  }
  for (const v of p.visits) {
    docs.push({
      id: `${p.id}-visit-${v.date}`,
      patientId: p.id,
      kind: "visit",
      title: `${p.name} ${v.date} ${v.type} 기록`,
      text: `${p.name} ${v.date} ${v.type}: ${v.summary}`,
    });
  }
  return docs;
}

export function guidelineDocs(): RagDoc[] {
  return [...guidelines, ...extraGuidelines].map((g) => ({
    id: g.id,
    patientId: "general",
    kind: "guideline",
    title: `${g.topic}: ${g.title}`,
    text: `${g.title}. ${g.content}`,
    source: g.id.startsWith("x-") ? "보충 지침" : "기본 지침",
  }));
}

export function builtinCorpus(): RagDoc[] {
  const docs: RagDoc[] = [];
  for (const p of patients) docs.push(...patientDocs(p));
  docs.push(...guidelineDocs());
  return docs;
}

// 환자의 최근 검사와 기록 전체. 위험도 평가 시 검색 결과와 별도로 항상 포함한다.
export function patientContext(patientId: string): string {
  const p = patients.find((x) => x.id === patientId);
  if (!p) return "";
  return patientDocs(p).map((d) => d.text).join("\n");
}
