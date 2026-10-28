// 지침 문서의 출처. PMID는 PubMed에서 확인한 값이다.
export type Source = { key: string; label: string; pmid?: string; url?: string; kind: "문헌" | "기관문서" | "확인필요" };

export const sources: Record<string, Source> = {
  tomblyn2009: { key: "tomblyn2009", label: "Tomblyn 2009, 조혈모세포이식 수혜자 감염 합병증 예방 지침, Biol Blood Marrow Transplant", pmid: "19747629", kind: "문헌" },
  harris2016: { key: "harris2016", label: "Harris 2016, MAGIC 급성 GVHD 임상 자료 표준화와 병기, Biol Blood Marrow Transplant", pmid: "26386318", kind: "문헌" },
  jagasia2015: { key: "jagasia2015", label: "Jagasia 2015, NIH 만성 GVHD 진단과 병기 합의, Biol Blood Marrow Transplant", pmid: "25529383", kind: "문헌" },
  styczynski2016: { key: "styczynski2016", label: "Styczynski 2016, ECIL-6 EBV 감염과 PTLD 관리 지침, Haematologica", pmid: "27365460", kind: "문헌" },
  ljungman2019: { key: "ljungman2019", label: "Ljungman 2019, ECIL 2017 CMV 감염 관리 지침, Lancet Infect Dis", pmid: "31153807", kind: "문헌" },
  cordonnier2019: { key: "cordonnier2019", label: "Cordonnier 2019, ECIL 7 조혈모세포이식 수혜자 예방접종 지침, Lancet Infect Dis", pmid: "30744963", kind: "문헌" },
  rubin2014: { key: "rubin2014", label: "Rubin 2014, IDSA 면역저하자 예방접종 임상 지침, Clin Infect Dis", pmid: "24311479", kind: "문헌" },
  majhail2012: { key: "majhail2012", label: "Majhail 2012, 조혈모세포이식 장기 생존자 선별과 예방 권고, Biol Blood Marrow Transplant", pmid: "22178693", kind: "문헌" },
  freifeld2011: { key: "freifeld2011", label: "Freifeld 2011, IDSA 호중구감소 발열 환자 항균제 사용 지침, Clin Infect Dis", pmid: "21258094", kind: "문헌" },
  cesaro2018: { key: "cesaro2018", label: "Cesaro 2018, ECIL BK 바이러스 출혈성 방광염 지침, J Antimicrob Chemother", pmid: "29190347", kind: "문헌" },
  mohty2016: { key: "mohty2016", label: "Mohty 2016, EBMT 성인 간정맥폐쇄병 진단과 중증도 기준, Bone Marrow Transplant", pmid: "27183098", kind: "문헌" },
  hirsch2013: { key: "hirsch2013", label: "Hirsch 2013, ECIL-4 호흡기 바이러스 감염 진단과 치료 지침, Clin Infect Dis", pmid: "23024295", kind: "문헌" },
  christians2002: { key: "christians2002", label: "Christians 2002, Tacrolimus 약물 상호작용 기전, Clin Pharmacokinet", pmid: "12190331", kind: "문헌" },
  sonbol2019: { key: "sonbol2019", label: "Sonbol 2019, 저균식의 감염 예방 효과 체계적 문헌고찰, BMJ Support Palliat Care", pmid: "30948447", kind: "문헌" },
  elad2020: { key: "elad2020", label: "Elad 2020, MASCC/ISOO 점막염 관리 임상 지침, Cancer", pmid: "32786044", kind: "문헌" },
  kaufman2015: { key: "kaufman2015", label: "Kaufman 2015, AABB 혈소판 수혈 임상 지침, Ann Intern Med", pmid: "25383671", kind: "문헌" },
  ogrady2011: { key: "ogrady2011", label: "O'Grady 2011, 혈관내 카테터 관련 감염 예방 지침, Clin Infect Dis", pmid: "21460264", kind: "문헌" },
  olsson2013: { key: "olsson2013", label: "Olsson 2013, 동종이식 생착 부전의 위험인자, Bone Marrow Transplant", pmid: "23222384", kind: "문헌" },
  ullrich2022: { key: "ullrich2022", label: "Ullrich 2022, 조혈모세포이식 생존자의 피로와 완화 전략, Transplant Cell Ther", pmid: "36494015", kind: "문헌" },
  amcNutrition: { key: "amcNutrition", label: "서울아산병원 영양팀, 면역 기능 저하 환자의 영양 관리, 2025", kind: "기관문서" },
  amcLmd: { key: "amcLmd", label: "저균식 안내, 기관 환자교육 자료", kind: "기관문서" },
  institutional: { key: "institutional", label: "구체적 기준값은 본원 프로토콜 확인 필요", kind: "확인필요" },
};

export function sourceUrl(s: Source) {
  return s.url ?? (s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : undefined);
}

export function sourceLabels(keys: string[] | undefined) {
  return (keys ?? []).map((k) => sources[k]?.label).filter(Boolean) as string[];
}
