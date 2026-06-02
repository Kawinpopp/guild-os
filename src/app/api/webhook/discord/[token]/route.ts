import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "../../_lib";

export const dynamic = "force-dynamic";

// Discord bot POSTs here: POST /api/webhook/discord/{token}
// Payload: { author: { id: string, username: string }, content: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await req.json();

  const platformUserId = body?.author?.id ?? body?.author?.username;
  const content: string = body?.content ?? "";

  if (!platformUserId) return NextResponse.json({ error: "Missing author" }, { status: 400 });

  const result = await saveMessage(token, platformUserId, content);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ status: "ok" });
}
