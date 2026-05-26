import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { DiscordWebhookPayload, FacebookWebhookPayload, LineWebhookPayload } from "@/interface";

export const dynamic = "force-dynamic";

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  _supabase = createClient(url, key);
  return _supabase;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhook_url: string }> }
) {
  const { webhook_url } = await params;

  const { data: community, error } = await getSupabase()
    .from("communities")
    .select("id, platform")
    .eq("webhook_url", webhook_url)
    .single();

  if (error || !community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const body = await req.json() as DiscordWebhookPayload & FacebookWebhookPayload & LineWebhookPayload;

  const author =
    body?.author?.name ||
    body?.entry?.[0]?.messaging?.[0]?.sender?.id ||
    body?.events?.[0]?.source?.userId ||
    "unknown";

  const content =
    body?.content ||
    body?.entry?.[0]?.messaging?.[0]?.message?.text ||
    body?.events?.[0]?.message?.text ||
    "";

  if (content) {
    await getSupabase().from("flagged_posts").insert({
      community_id: community.id,
      author,
      content,
      platform: community.platform,
      score: 0,
      status: "pending",
    });

    await getSupabase().from("activity_feed").insert({
      community_id: community.id,
      type: "moderation",
      message: `New message received from ${author}`,
    });
  }

  return NextResponse.json({ status: "ok" });
}

// Facebook webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
