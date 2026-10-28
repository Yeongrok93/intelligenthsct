// LLM 출력과 UI 문구에 문체 규칙을 강제한다. 사잇점, 엠대쉬, 괄호 제거.
export function tidy(text: string): string {
  if (!text) return text;
  return text
    .replace(/[·•・]/g, ", ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s*\(([^()]{1,60})\)/g, ", $1")
    .replace(/[()]/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/,\s*,/g, ",")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function tidyDeep<T>(value: T): T {
  if (typeof value === "string") return tidy(value) as T;
  if (Array.isArray(value)) return value.map(tidyDeep) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = tidyDeep(v);
    return out as T;
  }
  return value;
}
