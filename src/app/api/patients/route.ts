import { NextResponse } from "next/server";
import { patients, daysSince } from "@/data/patients";

export function GET() {
  return NextResponse.json(
    patients.map((p) => ({ ...p, dplus: daysSince(p.transplantDate) }))
  );
}
