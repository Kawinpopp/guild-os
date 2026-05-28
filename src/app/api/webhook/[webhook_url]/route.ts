import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type {
  DiscordWebhookPayload,
  FacebookWebhookPayload,
  LineWebhookPayload,
} from "@/interface";

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
  { params }: { params: Promise<{ webhook_url: string }> },
) {
  const { webhook_url } = await params;
  const supabase = getSupabase();

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .select("id, platform")
    .eq("platform_group_id", webhook_url)
    .single();

  if (communityError || !community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const body = (await req.json()) as DiscordWebhookPayload &
    FacebookWebhookPayload &
    LineWebhookPayload;

  const platformUserId =
    body?.author?.name ||
    body?.entry?.[0]?.messaging?.[0]?.sender?.id ||
    body?.events?.[0]?.source?.userId ||
    "unknown";

  const content =
    body?.content ||
    body?.entry?.[0]?.messaging?.[0]?.message?.text ||
    body?.events?.[0]?.message?.text ||
    "";

  if (!content) {
    return NextResponse.json({ status: "ok" });
  }

  // Upsert user by platform_user_id (unique per the schema)
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        platform_user_id: platformUserId,
        platform_type: community.platform,
        display_name: platformUserId,
      },
      { onConflict: "platform_user_id" },
    )
    .select("id")
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }

  await supabase.from("posts").insert({
    community_id: community.id,
    user_id: user.id,
    content_type: "post",
    content_preview: content.slice(0, 500),
  });

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
