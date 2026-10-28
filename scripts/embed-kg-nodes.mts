// 지식그래프 노드 라벨에 256차원 임베딩을 붙인다. 증상 텍스트와 노드를 의미로 매칭하기 위함.
// 실행: npx tsx scripts/embed-kg-nodes.mts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
config({ path: path.join(root, ".env.local") });

export async function embedKgNodes() {
  const file = path.join(root, "src/data/kg.json");
  const kg = JSON.parse(fs.readFileSync(file, "utf8")) as { nodes: { id: string; label: string; type: string; vec?: number[] }[]; edges: unknown[] };
  const targets = kg.nodes.filter((n) => ["증상", "질환", "검사", "약물", "음식"].includes(n.type));
  const emb = new OpenAIEmbeddings({ model: "text-embedding-3-small", dimensions: 256 });
  for (let i = 0; i < targets.length; i += 100) {
    const batch = targets.slice(i, i + 100);
    const vecs = await emb.embedDocuments(batch.map((n) => n.label));
    batch.forEach((n, j) => (n.vec = vecs[j].map((x) => Math.round(x * 1e4) / 1e4)));
    console.log(`노드 임베딩 ${Math.min(i + 100, targets.length)}/${targets.length}`);
  }
  fs.writeFileSync(file, JSON.stringify(kg));
  // 화면용 경량본. 벡터를 뺀다
  const lite = { ...kg, nodes: kg.nodes.map(({ vec: _v, ...n }) => n) };
  fs.writeFileSync(path.join(root, "src/data/kg-lite.json"), JSON.stringify(lite));
  console.log(`kg.json 갱신: 임베딩 노드 ${targets.length}개, kg-lite.json 저장`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  embedKgNodes().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
