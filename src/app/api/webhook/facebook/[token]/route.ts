import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "../../_lib";

export const dynamic = "force-dynamic";

// Facebook sets webhook URL to: /api/webhook/facebook/{token}
// Payload (Group feed): { entry: [{ changes: [{ value: { from: { id }, message } }] }] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json();

  const change = body?.entry?.[0]?.changes?.[0]?.value;
  const platformUserId: string = change?.from?.id ?? "";
  const content: string = change?.message ?? "";

  if (!platformUserId) return NextResponse.json({ error: "Missing sender" }, { status: 400 });

  const result = await saveMessage(token, platformUserId, content);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ status: "ok" });
}

// Facebook webhook verification challenge
// The platform_group_id UUID in the URL doubles as the verify token —
// admin enters it in Facebook Developer Console → no extra env var needed.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: urlToken } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && verifyToken === urlToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
