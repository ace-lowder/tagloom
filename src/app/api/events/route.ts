import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = String(body?.event ?? "unknown");

    // For MVP, log server-side events and optionally replace with your analytics provider later.
    console.log("[event]", event, {
      at: new Date().toISOString(),
      metadata: body?.metadata ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
