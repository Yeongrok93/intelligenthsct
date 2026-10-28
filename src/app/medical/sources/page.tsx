import { guidelines } from "@/data/guidelines";
import { extraGuidelines } from "@/data/guidelinesExtra";
import { sources, sourceUrl } from "@/data/sources";
import { Card } from "@/components/ui";

const KIND_STYLE: Record<string, string> = {
  문헌: "bg-blue-50 text-blue-700",
  기관문서: "bg-gray-100 text-gray-800",
  확인필요: "bg-amber-50 text-amber-700",
};

export default function SourcesPage() {
  const docs = [...guidelines, ...extraGuidelines];
  const used = new Set(docs.flatMap((d) => d.sources ?? []));
  return (
    <div>
      <h1 className="text-2xl font-bold">근거 문서</h1>
      <p className="mb-5 text-sm text-ink-soft">
        AI가 판단에 쓰는 지침 {docs.length}개와 그 출처입니다. 문헌 출처의 PMID는 PubMed에서 확인했습니다. 지침 본문은 출처를 요약한 교육용 문장이며 구체적 기준값은 본원 프로토콜이 우선합니다.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {docs.map((d) => (
            <Card key={d.id}>
              <p className="text-xs text-ink-mute">
                {d.topic} <span className="ml-1">{d.id.startsWith("x-") ? "보충 지침" : "기본 지침"}</span>
              </p>
              <p className="text-base font-bold">{d.title}</p>
              <ul className="mt-2 space-y-1">
                {(d.sources ?? []).map((k) => {
                  const s = sources[k];
                  if (!s) return null;
                  const url = sourceUrl(s);
                  return (
                    <li key={k} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${KIND_STYLE[s.kind]}`}>{s.kind}</span>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-ink-soft hover:underline">
                          {s.label}, PMID {s.pmid}
                        </a>
                      ) : (
                        <span className="text-ink-soft">{s.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <Card>
            <p className="text-xs font-semibold text-ink-mute">출처 목록</p>
            <ul className="mt-2 space-y-1.5">
              {Object.values(sources)
                .filter((s) => used.has(s.key))
                .map((s) => {
                  const url = sourceUrl(s);
                  return (
                    <li key={s.key} className="text-xs leading-snug">
                      <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[s.kind]}`}>{s.kind}</span>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" className="text-ink-soft hover:underline">
                          {s.label}
                        </a>
                      ) : (
                        <span className="text-ink-soft">{s.label}</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </Card>
          <Card>
            <p className="text-xs font-semibold text-ink-mute">기관 원본 문서</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              영양팀 안내서 24쪽과 저균식 안내문은 텍스트로 옮겨 검색 색인에 들어 있습니다. 식단 판단과 지식그래프의 음식 관련 개념은 대부분 여기서 나옵니다.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
