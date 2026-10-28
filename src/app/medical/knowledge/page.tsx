"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import kgLite from "@/data/kg-lite.json";
import { Card } from "@/components/ui";

const kg = kgLite as { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relation: string; evidence: string }[]; builtAt?: string };

const TYPE_COLOR: Record<string, string> = {
  증상: "#dc2626",
  질환: "#7c3aed",
  검사: "#0f766e",
  약물: "#2563eb",
  조치: "#d97706",
  음식: "#65a30d",
  시기: "#6b7280",
  기타: "#a8a29e",
};

type Pos = { x: number; y: number; vx: number; vy: number };

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const posRef = useRef<Map<string, Pos>>(new Map());
  const W = 900, H = 620;

  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of kg.edges) {
      d.set(e.source, (d.get(e.source) ?? 0) + 1);
      d.set(e.target, (d.get(e.target) ?? 0) + 1);
    }
    return d;
  }, []);

  // 표시할 노드: 연결이 많은 상위 노드를 기본으로, 검색이나 선택이 있으면 그 이웃
  const visible = useMemo(() => {
    let ids: Set<string>;
    if (selected) {
      ids = new Set([selected]);
      for (const e of kg.edges) {
        if (e.source === selected) ids.add(e.target);
        if (e.target === selected) ids.add(e.source);
      }
    } else if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hits = kg.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id);
      ids = new Set(hits);
      for (const e of kg.edges) {
        if (hits.includes(e.source)) ids.add(e.target);
        if (hits.includes(e.target)) ids.add(e.source);
      }
    } else {
      ids = new Set(
        [...kg.nodes]
          .filter((n) => !typeFilter || n.type === typeFilter)
          .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
          .slice(0, 70)
          .map((n) => n.id)
      );
    }
    const nodes = kg.nodes.filter((n) => ids.has(n.id));
    const edges = kg.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }, [query, selected, typeFilter, degree]);

  useEffect(() => {
    const pos = posRef.current;
    for (const n of visible.nodes) {
      if (!pos.has(n.id)) pos.set(n.id, { x: W / 2 + (Math.random() - 0.5) * 300, y: H / 2 + (Math.random() - 0.5) * 300, vx: 0, vy: 0 });
    }
    let frame = 0;
    let raf = 0;
    const step = () => {
      const ns = visible.nodes;
      for (let i = 0; i < ns.length; i++) {
        const a = pos.get(ns[i].id)!;
        for (let j = i + 1; j < ns.length; j++) {
          const b = pos.get(ns[j].id)!;
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
          const f = 2200 / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }
      for (const e of visible.edges) {
        const a = pos.get(e.source), b = pos.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 90) * 0.02;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      for (const n of ns) {
        const p = pos.get(n.id)!;
        p.vx += (W / 2 - p.x) * 0.004; p.vy += (H / 2 - p.y) * 0.004;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x = Math.max(30, Math.min(W - 30, p.x + p.vx));
        p.y = Math.max(30, Math.min(H - 30, p.y + p.vy));
      }
      setTick((t) => t + 1);
      if (++frame < 160) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const sel = selected ? kg.nodes.find((n) => n.id === selected) : null;
  const selEdges = selected ? kg.edges.filter((e) => e.source === selected || e.target === selected) : [];
  const types = Object.keys(TYPE_COLOR);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of kg.nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">지식그래프</h1>
          <p className="text-sm text-ink-soft">
            지침 문서에서 추출한 개념 {kg.nodes.length}개와 관계 {kg.edges.length}개. 증상에서 관련 질환, 검사, 조치를 따라가 검색을 넓히는 데 씁니다.
          </p>
        </div>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="개념 검색, 예: 발진, EBV, 자몽" className="w-64 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none focus:border-brand" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button key={t} onClick={() => { setTypeFilter(typeFilter === t ? null : t); setSelected(null); setQuery(""); }} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${typeFilter === t ? "border-ink bg-ink text-white" : "border-line bg-card text-ink-soft"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t] }} />
            {t} {counts[t] ?? 0}
          </button>
        ))}
        {(selected || query || typeFilter) && (
          <button onClick={() => { setSelected(null); setQuery(""); setTypeFilter(null); }} className="rounded-full px-2.5 py-1 text-xs text-ink-mute underline">
            전체 보기
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[620px] w-full bg-white" data-tick={tick}>
            {visible.edges.map((e, i) => {
              const a = posRef.current.get(e.source), b = posRef.current.get(e.target);
              if (!a || !b) return null;
              const hi = selected && (e.source === selected || e.target === selected);
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hi ? "#0f766e" : "#d6d3d1"} strokeWidth={hi ? 2 : 1} />
                  {hi && <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 3} fontSize="9" fill="#57534e" textAnchor="middle">{e.relation}</text>}
                </g>
              );
            })}
            {visible.nodes.map((n) => {
              const p = posRef.current.get(n.id);
              if (!p) return null;
              const r = 5 + Math.min(10, (degree.get(n.id) ?? 1) * 0.8);
              const isSel = n.id === selected;
              return (
                <g key={n.id} onClick={() => setSelected(isSel ? null : n.id)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r={r} fill={TYPE_COLOR[n.type] ?? "#a8a29e"} stroke={isSel ? "#1c1917" : "white"} strokeWidth={isSel ? 3 : 1.5} />
                  <text x={p.x} y={p.y - r - 3} fontSize="10" textAnchor="middle" fill="#1c1917" style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 3 }}>
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>
        <div className="space-y-3">
          <Card>
            {sel ? (
              <>
                <p className="flex items-center gap-2 text-base font-bold">
                  <span className="h-3 w-3 rounded-full" style={{ background: TYPE_COLOR[sel.type] }} />
                  {sel.label} <span className="text-xs font-normal text-ink-mute">{sel.type}</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {selEdges.map((e, i) => {
                    const other = kg.nodes.find((n) => n.id === (e.source === sel.id ? e.target : e.source));
                    if (!other) return null;
                    return (
                      <li key={i} className="text-sm">
                        <button onClick={() => setSelected(other.id)} className="text-left hover:underline">
                          {e.source === sel.id ? (
                            <>
                              <span className="text-ink-mute">{e.relation} →</span> <span className="font-semibold">{other.label}</span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold">{other.label}</span> <span className="text-ink-mute">→ {e.relation}</span>
                            </>
                          )}
                        </button>
                        <span className="ml-1 text-[10px] text-ink-mute">{e.evidence}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">사용 방법</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  노드를 누르면 연결된 개념과 근거 문서 id가 보입니다. 환자가 말한 증상이 그래프의 노드와 맞으면 이웃 노드를 검색어에 더하고, 관계의 근거 문서를 우선 검색합니다.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">예: 귀 불편감 → 두경부 림프절 비대 → PTLD → EBV PCR 상승 → 외래 당기기</p>
              </>
            )}
          </Card>
          <Card>
            <p className="text-xs font-semibold text-ink-mute">생성 방식</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              본원 지침, 보충 지침, 기관 영양 문서를 Claude가 읽고 주어, 관계, 목적어 triple을 뽑아 병합했습니다. 문서에 없는 사실은 넣지 않도록 제한했고 각 관계는 근거 문서 id를 가집니다.
              {kg.builtAt && <span className="block text-ink-mute">생성 시각 {kg.builtAt.slice(0, 16).replace("T", " ")}</span>}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
