// 검색. 사전 계산한 임베딩 index.json과 지식그래프 확장을 결합한다. 임베딩 호출이 실패하면 키워드 검색으로 대체한다.
import { OpenAIEmbeddings } from "@langchain/openai";
import indexJson from "@/data/index.json";
import { builtinCorpus, type RagDoc } from "@/lib/corpus";
import { expand, type KgExpansion } from "@/lib/kg";
import { sourceLabels } from "@/data/sources";

export type { RagDoc } from "@/lib/corpus";
export { patientContext } from "@/lib/corpus";
export type RagHit = RagDoc & { score: number; via?: string[] };

type Index = { model: string; docs: (RagDoc & { embedding: number[] })[] };
const index = indexJson as unknown as Index;
// 출처는 임베딩과 무관한 메타데이터라 코드의 최신 값을 붙인다
const builtin = new Map(builtinCorpus().map((d) => [d.id, d]));
function attachSources(d: RagDoc): RagDoc {
  const b = builtin.get(d.id);
  if (b?.sources) return { ...d, sources: b.sources };
  if (d.id.startsWith("ext-nutrition")) return { ...d, sources: ["amcNutrition"] };
  if (d.id.startsWith("ext-low_microbial")) return { ...d, sources: ["amcLmd"] };
  return d;
}
const docs: RagDoc[] =
  index.docs.length > 0
    ? index.docs.map((d) => {
        const copy: RagDoc & { embedding?: number[] } = { ...d };
        delete copy.embedding;
        return attachSources(copy as RagDoc);
      })
    : builtinCorpus();

// 프롬프트에 넣을 문서 한 건. 제목, 출처, 본문
export function formatHit(h: RagDoc): string {
  const src = sourceLabels(h.sources);
  return `[${h.title}${src.length ? ", 출처: " + src.join("; ") : ""}] ${h.text}`;
}
const vectors = new Map<string, number[]>(index.docs.map((d) => [d.id, d.embedding]));

let embedder: OpenAIEmbeddings | null = null;
let nodeEmbedder: OpenAIEmbeddings | null = null;
function getEmbedder() {
  if (!embedder) embedder = new OpenAIEmbeddings({ model: index.model || "text-embedding-3-small" });
  return embedder;
}
function getNodeEmbedder() {
  if (!nodeEmbedder) nodeEmbedder = new OpenAIEmbeddings({ model: "text-embedding-3-small", dimensions: 256 });
  return nodeEmbedder;
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

function keywordScore(query: string, text: string) {
  const terms = query.toLowerCase().split(/[\s,.]+/).filter((t) => t.length >= 2);
  const lower = text.toLowerCase();
  let s = 0;
  for (const t of terms) if (lower.includes(t)) s += 1;
  return terms.length ? s / terms.length : 0;
}

export function docsById(ids: string[]): RagDoc[] {
  return ids.map((id) => docs.find((d) => d.id === id)).filter((d): d is RagDoc => !!d);
}

// 지식그래프 확장. 텍스트에는 어휘 매칭을, 짧은 개념어 목록에는 의미 매칭을 쓴다.
export async function graphExplain(query: string, concepts: string[] = []): Promise<KgExpansion> {
  const clean = concepts.map((c) => c.trim()).filter((c) => c.length >= 2).slice(0, 8);
  if (clean.length === 0) return expand(query);
  try {
    const vecs = await getNodeEmbedder().embedDocuments(clean);
    return expand(`${query} ${clean.join(" ")}`, vecs);
  } catch {
    return expand(`${query} ${clean.join(" ")}`);
  }
}

export async function retrieve(
  query: string,
  opts: { patientId?: string; k?: number; kinds?: RagDoc["kind"][]; useGraph?: boolean; graph?: KgExpansion }
): Promise<RagHit[]> {
  const k = opts.k ?? 8;
  const filter = (d: RagDoc) => (d.patientId === "general" || d.patientId === opts.patientId) && (!opts.kinds || opts.kinds.includes(d.kind));
  const candidates = docs.filter(filter);

  const graph = opts.graph ?? (opts.useGraph === false ? null : await graphExplain(query));
  const boostTerms = graph ? graph.related.map((n) => n.label.toLowerCase()) : [];
  const evidenceIds = graph ? new Set(graph.evidenceDocs) : new Set<string>();
  const boost = (d: RagDoc) => {
    let b = 0;
    const lower = d.text.toLowerCase();
    const via: string[] = [];
    for (const t of boostTerms)
      if (t.length >= 2 && lower.includes(t)) {
        b += 0.03;
        via.push(t);
      }
    if (evidenceIds.has(d.id)) {
      b += 0.12;
      via.push("근거문서");
    }
    return { b: Math.min(b, 0.2), via };
  };

  let scored: RagHit[];
  try {
    if (vectors.size === 0) throw new Error("no index");
    const q = await getEmbedder().embedQuery(query);
    scored = candidates.map((d) => {
      const v = vectors.get(d.id);
      const base = v ? cosine(q, v) : keywordScore(query, d.text) * 0.5;
      const { b, via } = boost(d);
      return { ...d, score: base + b, via };
    });
  } catch {
    scored = candidates.map((d) => {
      const { b, via } = boost(d);
      return { ...d, score: keywordScore(query, d.text) + b, via };
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
