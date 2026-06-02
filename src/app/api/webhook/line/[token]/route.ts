import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "../../_lib";

export const dynamic = "force-dynamic";

// LINE sets webhook URL to: /api/webhook/line/{token}
// Payload: { events: [{ source: { userId }, message: { text } }] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const event = body?.events?.[0];
  const platformUserId: string = event?.source?.userId ?? "";
  const content: string = event?.message?.text ?? "";

  if (!platformUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const result = await saveMessage(token, platformUserId, content);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ status: "ok" });
}
