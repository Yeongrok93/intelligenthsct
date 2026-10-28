"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  prompt?: string;
};

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSR(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceRecorder({ onTranscript, disabled, prompt }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [showTyping, setShowTyping] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const srRef = useRef<SR | null>(null);
  const srFinalRef = useRef("");

  function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(analyser.fftSize);
    const render = () => {
      analyser.getByteTimeDomainData(buf);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0f766e";
      ctx.beginPath();
      const slice = w / buf.length;
      let x = 0;
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        peak = Math.max(peak, Math.abs(v - 1));
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      setLevel(Math.min(1, peak * 2.5));
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  }

  function stopVisual() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setLevel(0);
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  }

  useEffect(() => () => stopVisual(), []);

  async function start() {
    setError(null);
    setInterim("");
    srFinalRef.current = "";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "Unknown";
      const msg: Record<string, string> = {
        NotAllowedError: "마이크 권한이 거부되었습니다. 브라우저 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.",
        NotFoundError: "마이크를 찾을 수 없습니다.",
        NotReadableError: "다른 프로그램이 마이크를 사용 중입니다.",
        SecurityError: "HTTPS 환경에서만 마이크를 쓸 수 있습니다.",
      };
      setError(msg[name] ?? "마이크를 열 수 없습니다. 아래에서 직접 입력해 주세요.");
      setShowTyping(true);
      return;
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    const ac = new AudioContext();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    audioCtxRef.current = ac;
    analyserRef.current = an;
    draw();
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      stopVisual();
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      await transcribe(blob);
    };
    rec.start();
    recorderRef.current = rec;
    setRecording(true);

    const SRC = getSR();
    if (SRC) {
      try {
        const sr = new SRC();
        sr.lang = "ko-KR";
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let interimText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) srFinalRef.current += r[0].transcript;
            else interimText += r[0].transcript;
          }
          setInterim(srFinalRef.current + interimText);
        };
        sr.onerror = () => {};
        sr.start();
        srRef.current = sr;
      } catch {}
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    try {
      srRef.current?.stop();
    } catch {}
    srRef.current = null;
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      const text = (data.text ?? "").trim() || srFinalRef.current.trim() || interim.trim();
      if (!text) {
        setError("음성이 인식되지 않았습니다. 다시 말씀해 주시거나 직접 입력해 주세요.");
        setShowTyping(true);
        return;
      }
      setInterim("");
      onTranscript(text);
    } catch {
      const fallback = srFinalRef.current.trim() || interim.trim();
      if (fallback) onTranscript(fallback);
      else {
        setError("음성 변환에 실패했습니다. 직접 입력해 주세요.");
        setShowTyping(true);
      }
    } finally {
      setTranscribing(false);
    }
  }

  const bars = 14;

  return (
    <div className="space-y-3">
      {prompt && !recording && !transcribing && <p className="text-sm text-ink-soft">{prompt}</p>}

      <div className={`relative overflow-hidden rounded-2xl border transition ${recording ? "border-brand bg-white" : "border-line bg-white/60"}`}>
        <canvas ref={canvasRef} width={640} height={72} className={`block h-[72px] w-full ${recording ? "opacity-100" : "opacity-30"}`} />
        {recording && (
          <div className="absolute left-3 top-2 flex items-center gap-2 text-xs font-semibold text-brand">
            <span className="h-2 w-2 animate-pulse rounded-full bg-risk-red" />
            듣고 있어요 {String(Math.floor(elapsed / 60)).padStart(1, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </div>
        )}
        {!recording && !transcribing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-ink-mute">버튼을 누르고 증상을 말씀해 주세요</div>
        )}
        {transcribing && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 text-sm font-semibold text-brand">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            말씀을 글로 바꾸는 중
          </div>
        )}
      </div>

      {recording && (
        <div className="flex h-6 items-end justify-center gap-1">
          {Array.from({ length: bars }).map((_, i) => {
            const center = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2);
            const h = Math.max(3, Math.round(level * 24 * (1 - center * 0.7) + (Math.sin(Date.now() / 90 + i) + 1) * 2 * level));
            return <span key={i} className="w-1.5 rounded-full bg-brand transition-all duration-75" style={{ height: `${h}px`, opacity: 0.4 + level * 0.6 }} />;
          })}
        </div>
      )}

      {(recording || interim) && (
        <div className="min-h-[2.5rem] rounded-xl bg-gray-100 px-3 py-2 text-sm leading-relaxed text-ink-soft">
          {interim ? <span className="text-ink">{interim}</span> : <span className="text-ink-mute">말씀하신 내용이 여기 표시됩니다</span>}
        </div>
      )}

      {error && <p className="text-sm text-risk-red">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={recording ? stop : start}
          disabled={disabled || transcribing}
          className={`relative flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-bold text-white transition disabled:opacity-40 ${
            recording ? "bg-risk-red" : "bg-brand hover:bg-brand-deep"
          }`}
        >
          <span className={`relative flex h-6 w-6 items-center justify-center ${recording ? "pulse-ring" : ""}`}>
            {recording ? (
              <span className="h-3.5 w-3.5 rounded-sm bg-white" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
            )}
          </span>
          {recording ? "말하기 끝" : "눌러서 말하기"}
        </button>
        <button onClick={() => setShowTyping((v) => !v)} disabled={recording || transcribing} className="rounded-2xl border border-line bg-card px-4 text-sm font-semibold text-ink-soft disabled:opacity-40">
          글로
        </button>
      </div>

      {showTyping && !recording && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = typed.trim();
            if (!t) return;
            setTyped("");
            setShowTyping(false);
            onTranscript(t);
          }}
          className="flex gap-2"
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="증상을 글로 입력"
            className="flex-1 rounded-xl border border-line bg-card px-3 py-3 text-sm outline-none focus:border-brand"
          />
          <button type="submit" disabled={disabled || !typed.trim()} className="rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">
            보내기
          </button>
        </form>
      )}
    </div>
  );
}
