// 이미지 기반 PDF 페이지를 Claude vision으로 옮겨 적어 텍스트 파일을 만든다.
// 실행: npx tsx scripts/transcribe-pages.mts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
config({ path: path.join(root, ".env.local") });

const pagesDir = path.join(root, "guideline/extracted/pages");
const outFile = path.join(root, "guideline/extracted/nutrition.txt");
const client = new Anthropic();

async function transcribe(file: string): Promise<string> {
  const data = fs.readFileSync(path.join(pagesDir, file)).toString("base64");
  const res = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4096,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data } },
          {
            type: "text",
            text: "이 페이지의 본문 텍스트를 빠짐없이 한국어 그대로 옮겨 적어라. 표는 각 행을 한 줄로 풀어 쓴다. 그림 설명이나 장식 문구는 생략한다. 페이지에 없는 내용은 절대 추가하지 않는다. 옮겨 적은 텍스트만 출력한다.",
          },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") return "";
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function main() {
  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".png")).sort();
  const results: string[] = new Array(files.length).fill("");
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        results[i] = await transcribe(files[i]);
        console.log(`${files[i]}: ${results[i].length}자`);
      } catch (e) {
        console.warn(`${files[i]} 실패:`, e instanceof Error ? e.message : e);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  const text = results.map((t, i) => `[${i + 1}쪽]\n${t}`).join("\n\n");
  fs.writeFileSync(outFile, text, "utf8");
  console.log(`저장: ${outFile} (${text.length}자)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
