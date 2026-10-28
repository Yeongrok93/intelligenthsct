// NDJSON 스트림 공통 유틸. 서버는 한 줄에 하나씩 JSON 이벤트를 보내고 클라이언트는 줄 단위로 읽는다.

export type StatusEvent = { type: "status"; label: string; hints?: string[] };

export function ndjsonResponse(run: (send: (ev: unknown) => void) => Promise<void>) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: unknown) => controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      try {
        await run(send);
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } });
}

export async function readNdjson<T extends { type: string }>(res: Response, onEvent: (ev: T) => void) {
  if (!res.ok || !res.body) {
    let msg = "서버 응답 오류";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const ev = JSON.parse(line) as T & { message?: string };
      if (ev.type === "error") throw new Error(ev.message ?? "오류");
      onEvent(ev);
    }
  }
  if (buf.trim()) {
    const ev = JSON.parse(buf) as T & { message?: string };
    if (ev.type === "error") throw new Error(ev.message ?? "오류");
    onEvent(ev);
  }
}
