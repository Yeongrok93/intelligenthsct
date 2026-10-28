import type { RiskLevel } from "@/data/patients";

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  red: "응급실을 방문해주세요",
  yellow: "의료진에게 전화로 확인해주세요",
  green: "지금처럼 자가관리 잘해주세요",
};
