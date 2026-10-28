// 지식 빌드 스크립트.
// 1. 환자 기록, 기본 지침, 보충 지침, guideline/extracted/*.txt를 문서로 모은다
// 2. OpenAI 임베딩으로 src/data/index.json을 만든다
// 3. Claude로 지침에서 지식 triple을 뽑아 src/data/kg.json을 만든다
// 실행: npx tsx scripts/build-knowledge.mts  또는  npm run build:knowledge
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
config({ path: path.join(root, ".env.local") });

const { builtinCorpus } = await import(pathToFileURL(path.join(root, "src/lib/corpus.ts")).href);
type RagDoc = { id: string; patientId: string; kind: string; title: string; text: string; source?: string };

const EXTERNAL_TITLES: Record<string, string> = {
  "nutrition.txt": "면역 기능 저하 환자의 영양 관리",
  "low_microbial_diet.txt": "저균식 안내",
};

function chunk(text: string, size = 700): string[] {
  const sentences = text.replace(/\r/g, "").split(/(?<=[.!?。]|다\.)\s+|\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > size && cur) {
      out.push(cur.trim());
      cur = s;
    } else cur = cur ? cur + " " + s : s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function externalDocs(): RagDoc[] {
  const dir = path.join(root, "guideline/extracted");
  if (!fs.existsSync(dir)) return [];
  const docs: RagDoc[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".txt")) continue;
    const raw = fs.readFileSync(path.join(dir, f), "utf8").replace(/\u0007/g, "\n").replace(/[ \t]+/g, " ").trim();
    if (raw.length < 50) continue;
    const title = EXTERNAL_TITLES[f] ?? f.replace(/\.txt$/, "");
    chunk(raw).forEach((c, i) => {
      docs.push({ id: `ext-${f.replace(/\.txt$/, "")}-${i + 1}`, patientId: "general", kind: "external", title: `${title} ${i + 1}`, text: c, source: "기관 문서" });
    });
  }
  return docs;
}

const TripleSchema = z.object({
  triples: z.array(
    z.object({
      subject: z.string().describe("개념 이름. 짧고 일반적인 표현. 예: 발열, EBV PCR 상승, 자몽"),
      subjectType: z.enum(["증상", "질환", "검사", "약물", "조치", "음식", "시기", "기타"]),
      relation: z.enum(["징후이다", "위험을 높인다", "확인한다", "치료한다", "피한다", "허용한다", "상호작용한다", "예방한다", "원인이다", "시기이다", "동반한다"]),
      object: z.string(),
      objectType: z.enum(["증상", "질환", "검사", "약물", "조치", "음식", "시기", "기타"]),
    })
  ),
});

async function extractTriples(doc: RagDoc, llm: ChatAnthropic) {
  const structured = llm.withStructuredOutput(TripleSchema, { method: "jsonSchema" });
  const sys = `당신은 조혈모세포이식 간호 지식을 그래프로 정리하는 전문가다. 주어진 문서에서만 사실을 뽑아 주어, 관계, 목적어 형태의 triple로 만든다.
문서에 없는 사실을 만들지 않는다. 개념 이름은 같은 뜻이면 같은 표현으로 통일한다. 예: 발열, 설사, 발진, EBV PCR, CMV PCR, GVHD, PTLD, Tacrolimus, 응급실 방문, 의료진 연락, 외래 당기기.
한 문서에서 8개에서 20개 triple을 뽑는다. 괄호와 특수기호를 쓰지 않는다.`;
  const res = await structured.invoke([new SystemMessage(sys), new HumanMessage(`문서 제목: ${doc.title}\n\n${doc.text}`)]);
  return res.triples;
}

function slug(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "");
}

async function main() {
  const external = externalDocs();
  const docs: RagDoc[] = [...builtinCorpus(), ...external];
  console.log(`문서 ${docs.length}개, 외부 청크 ${external.length}개`);

  // 임베딩
  const emb = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const vecs: number[][] = [];
  for (let i = 0; i < docs.length; i += 64) {
    const batch = docs.slice(i, i + 64);
    vecs.push(...(await emb.embedDocuments(batch.map((d) => d.text))));
    console.log(`임베딩 ${Math.min(i + 64, docs.length)}/${docs.length}`);
  }
  const index = {
    model: "text-embedding-3-small",
    builtAt: new Date().toISOString(),
    docs: docs.map((d, i) => ({ ...d, embedding: vecs[i].map((x) => Math.round(x * 1e5) / 1e5) })),
  };
  fs.writeFileSync(path.join(root, "src/data/index.json"), JSON.stringify(index));
  console.log("index.json 저장");

  // 지식그래프. 지침과 외부 문서만 대상
  const kgDocs = docs.filter((d) => d.kind === "guideline" || d.kind === "external");
  const llm = new ChatAnthropic({ model: "claude-opus-5-5", maxTokens: 4096, outputConfig: { effort: "low" } });
  const nodes = new Map<string, { id: string; label: string; type: string }>();
  const edges: { source: string; target: string; relation: string; evidence: string }[] = [];
  const seen = new Set<string>();
  const queue = [...kgDocs];
  const worker = async () => {
    while (queue.length) {
      const d = queue.shift()!;
      try {
        const triples = await extractTriples(d, llm);
        for (const t of triples) {
          const s = slug(t.subject), o = slug(t.object);
          if (!s || !o || s === o) continue;
          if (!nodes.has(s)) nodes.set(s, { id: s, label: t.subject.trim(), type: t.subjectType });
          if (!nodes.has(o)) nodes.set(o, { id: o, label: t.object.trim(), type: t.objectType });
          const key = `${s}|${t.relation}|${o}`;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push({ source: s, target: o, relation: t.relation, evidence: d.id });
        }
        console.log(`triple 추출 ${d.id}: ${triples.length}개`);
      } catch (e) {
        console.warn(`실패 ${d.id}:`, e instanceof Error ? e.message : e);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  const kg = { builtAt: new Date().toISOString(), nodes: [...nodes.values()], edges };
  fs.writeFileSync(path.join(root, "src/data/kg.json"), JSON.stringify(kg, null, 1));
  console.log(`kg.json 저장: 노드 ${kg.nodes.length}, 엣지 ${kg.edges.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
