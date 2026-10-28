import { ChatAnthropic } from "@langchain/anthropic";

export const MODEL = "claude-opus-5-5";

export function makeLLM(opts?: { effort?: "low" | "medium" | "high"; maxTokens?: number }) {
  return new ChatAnthropic({
    model: MODEL,
    maxTokens: opts?.maxTokens ?? 4096,
    outputConfig: { effort: opts?.effort ?? "low" },
  });
}

export const FACT_RULES = `사실 규칙을 반드시 지킨다.
제공된 환자 기록, 본원 지침, 검색된 문헌에 근거해서만 말한다.
근거가 없는 수치, 기준값, 약 이름, 연구 결과, 통계를 만들어내지 않는다.
확인되지 않은 내용은 확인되지 않았다고 말하고 담당 의료진 확인을 권한다.
환자 기록에 없는 증상이나 검사 결과를 있었던 것처럼 쓰지 않는다.`;

export const STYLE_RULES = `문체 규칙을 반드시 지킨다.
사잇점 기호를 쓰지 않는다. 엠대쉬 기호를 쓰지 않는다. 괄호를 쓰지 않는다. 괄호로 부연하고 싶으면 쉼표로 이어 쓴다.
불필요한 부연 설명을 붙이지 않는다. 마크다운 기호 없이 평문으로 쓴다.
환자에게는 존댓말로 짧고 명확하게, 의료진에게는 간결한 임상 문체로 쓴다.
한국어로 쓴다.
${FACT_RULES}`;
