import { NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return NextResponse.json({ error: "audio 파일이 없습니다" }, { status: 400 });
  const buf = Buffer.from(await audio.arrayBuffer());
  const ext = (audio.type || "audio/webm").includes("mp4") ? "mp4" : "webm";
  const client = new OpenAI();
  const result = await client.audio.transcriptions.create({
    file: await toFile(buf, `speech.${ext}`, { type: audio.type || "audio/webm" }),
    model: "whisper-1",
    language: "ko",
    prompt: "조혈모세포이식 환자가 증상을 설명합니다. 발진, 설사, 발열, 귀 불편감, 이식편대숙주병, 면역억제제.",
  });
  return NextResponse.json({ text: result.text.trim() });
}
