// 지식그래프. scripts/build-knowledge.mts가 만든 kg.json을 읽어 검색어 확장과 근거 경로 설명에 쓴다.
import kgJson from "@/data/kg.json";

export type KgNode = { id: string; label: string; type: string; vec?: number[] };
export type KgEdge = { source: string; target: string; relation: string; evidence: string };
export type KnowledgeGraph = { nodes: KgNode[]; edges: KgEdge[]; builtAt?: string };

export const kg: KnowledgeGraph = kgJson as KnowledgeGraph;

const nodeById = new Map(kg.nodes.map((n) => [n.id, n]));
const adj = new Map<string, KgEdge[]>();
for (const e of kg.edges) {
  if (!adj.has(e.source)) adj.set(e.source, []);
  if (!adj.has(e.target)) adj.set(e.target, []);
  adj.get(e.source)!.push(e);
  adj.get(e.target)!.push(e);
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

// 너무 일반적이어서 시드로 쓰면 소음이 되는 노드
const GENERIC = new Set(["이식후", "면역기능저하환자", "면역기능저하", "환자", "의료진연락", "응급실방문", "외래당기기", "증상", "이식", "면역억제제", "동종조혈모세포이식", "조혈모세포이식", "식사", "음식", "위험평가"]);

// 어휘 매칭. 노드 라벨이 텍스트에 그대로 들어 있을 때만 매칭한다. 세 글자 이상.
export function matchNodes(text: string): KgNode[] {
  const t = norm(text);
  const found: KgNode[] = [];
  for (const n of kg.nodes) {
    const l = norm(n.label);
    if (l.length < 3 || GENERIC.has(l)) continue;
    if (t.includes(l)) found.push(n);
  }
  return found;
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// 의미 매칭. 짧은 개념어 임베딩과 노드 라벨 임베딩을 비교한다. 개념 하나당 상위 두 개.
export function matchNodesSemantic(conceptVecs: number[][], top = 2, min = 0.65): KgNode[] {
  const out = new Map<string, KgNode>();
  for (const qv of conceptVecs) {
    kg.nodes
      .filter((n) => n.vec && n.vec.length === qv.length && !GENERIC.has(norm(n.label)))
      .map((n) => ({ n, s: cosine(qv, n.vec!) }))
      .filter((x) => x.s >= min)
      .sort((a, b) => b.s - a.s)
      .slice(0, top)
      .forEach((x) => out.set(x.n.id, x.n));
  }
  return [...out.values()];
}

export type KgExpansion = {
  seeds: KgNode[];
  related: KgNode[];
  paths: string[];
  evidenceDocs: string[];
};

// 시드 노드에서 한두 단계 이웃을 따라가 관련 개념과 근거 문서를 모은다.
export function expand(text: string, conceptVecs?: number[][], maxRelated = 12): KgExpansion {
  const seedMap = new Map<string, KgNode>();
  for (const n of matchNodes(text)) seedMap.set(n.id, n);
  if (conceptVecs) for (const n of matchNodesSemantic(conceptVecs)) seedMap.set(n.id, n);
  const seeds = [...seedMap.values()].slice(0, 12);
  const related = new Map<string, KgNode>();
  const paths: string[] = [];
  const evidence = new Set<string>();
  for (const s of seeds) {
    for (const e of adj.get(s.id) ?? []) {
      const otherId = e.source === s.id ? e.target : e.source;
      const other = nodeById.get(otherId);
      if (!other) continue;
      related.set(other.id, other);
      evidence.add(e.evidence);
      const arrow = e.source === s.id ? `${s.label} → ${e.relation} → ${other.label}` : `${other.label} → ${e.relation} → ${s.label}`;
      if (paths.length < 12 && !paths.includes(arrow)) paths.push(arrow);
      if (other.type === "질환" || other.type === "검사") {
        for (const e2 of adj.get(other.id) ?? []) {
          const thirdId = e2.source === other.id ? e2.target : e2.source;
          const third = nodeById.get(thirdId);
          if (third && !seedMap.has(third.id)) {
            related.set(third.id, third);
            evidence.add(e2.evidence);
          }
        }
      }
    }
  }
  for (const s of seeds) related.delete(s.id);
  return { seeds, related: [...related.values()].slice(0, maxRelated), paths, evidenceDocs: [...evidence] };
}
