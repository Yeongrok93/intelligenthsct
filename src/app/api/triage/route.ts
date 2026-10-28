import { triageGraph, type Turn, type TriageStateType } from "@/lib/graph/triage";
import { getPatient } from "@/data/patients";

export const runtime = "nodejs";
export const maxDuration = 300;

// 그래프 실행 과정을 NDJSON으로 스트리밍한다. 각 노드가 끝날 때마다 한 줄씩 보낸다.
export async function POST(req: Request) {
  const body = (await req.json()) as { patientId: string; turns: Turn[] };
  if (!getPatient(body.patientId)) return new Response(JSON.stringify({ error: "환자를 찾을 수 없습니다" }), { status: 404 });
  if (!body.turns?.length) return new Response(JSON.stringify({ error: "증상 설명이 없습니다" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const acc: Partial<TriageStateType> = { patientId: body.patientId, turns: body.turns, trace: [] };
      try {
        for await (const chunk of await triageGraph.stream(
          { patientId: body.patientId, turns: body.turns },
          { streamMode: "updates" }
        )) {
          for (const [node, update] of Object.entries(chunk as Record<string, Partial<TriageStateType>>)) {
            if (!update) continue;
            for (const [k, v] of Object.entries(update)) {
              if (k === "trace") acc.trace = [...(acc.trace ?? []), ...(v as TriageStateType["trace"])];
              else (acc as Record<string, unknown>)[k] = v;
            }
            send({ type: "node", node, trace: update.trace ?? [] });
          }
        }
        send({
          type: "done",
          needMoreInfo: acc.needMoreInfo ?? false,
          questions: acc.needMoreInfo ? acc.symptoms?.followUpQuestions ?? [] : [],
          symptoms: acc.symptoms ?? null,
          assessment: acc.assessment ?? null,
          outputs: acc.outputs ?? null,
          alert: acc.alert ?? null,
          context: (acc.context ?? []).map((h) => ({ id: h.id, title: h.title, kind: h.kind, score: h.score })),
          kgPaths: acc.kgPaths ?? [],
          trace: acc.trace ?? [],
        });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } });
}
