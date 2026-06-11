import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { saveMessage } from "../../_lib";

export const dynamic = "force-dynamic";

type LineSource = { userId: string; groupId?: string };
type LineMessage = { type: string; text: string };
type LineEvent = { type: string; source: LineSource; message?: LineMessage };

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hash = createHmac("sha256", secret).update(rawBody).digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rawBody = await req.text();

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (channelSecret) {
    const signature = req.headers.get("x-line-signature") ?? "";
    if (!verifySignature(rawBody, signature, channelSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let events: LineEvent[] = [];
  try {
    const body = JSON.parse(rawBody) as { events?: LineEvent[] };
    events = body.events ?? [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const event of events) {
    if (event.type !== "message" || event.message?.type !== "text") continue;
    const platformUserId = event.source.userId;
    const content = event.message.text;
    if (!platformUserId || !content) continue;
    await saveMessage(token, platformUserId, content);
  }

  return NextResponse.json({ status: "ok" });
}
