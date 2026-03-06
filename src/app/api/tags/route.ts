import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Use /api/generate for authenticated generation." },
    { status: 410 },
  );
}
