import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabase } from "../../webhook/_lib";
import { NONCE_COOKIE } from "@/lib/join-session";

export const dynamic = "force-dynamic";

const PLATFORM_OAUTH: Record<string, { url: string; scope: string; clientEnv: string }> = {
  discord: {
    url: "https://discord.com/api/oauth2/authorize",
    scope: "identify",
    clientEnv: "DISCORD_CLIENT_ID",
  },
  line: {
    url: "https://access.line.me/oauth2/v2.1/authorize",
    scope: "profile openid",
    clientEnv: "LINE_LOGIN_CHANNEL_ID",
  },
  facebook: {
    url: "https://www.facebook.com/v18.0/dialog/oauth",
    scope: "public_profile",
    clientEnv: "FACEBOOK_APP_ID",
  },
};

export async function GET(req: NextRequest) {
  const communityId = req.nextUrl.searchParams.get("community_id");
  if (!communityId) {
    return new NextResponse("Missing community_id", { status: 400 });
  }

  const supabase = getSupabase();
  const { data: community } = await supabase
    .from("communities")
    .select("id, platform")
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return new NextResponse("Community not found", { status: 404 });
  }

  const platform = community.platform as string;
  const cfg = PLATFORM_OAUTH[platform];
  if (!cfg) {
    return new NextResponse(`Platform "${platform}" does not support OAuth`, { status: 400 });
  }

  const clientId = process.env[cfg.clientEnv];
  if (!clientId) {
    return new NextResponse(
      `OAuth credentials for ${platform} are not configured. Please set ${cfg.clientEnv}.`,
      { status: 500 },
    );
  }

  const nonce = randomBytes(16).toString("hex");
  const state = Buffer.from(JSON.stringify({ community_id: communityId, nonce })).toString(
    "base64url",
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${req.nextUrl.origin}/api/join/callback/${platform}`,
    response_type: "code",
    scope: cfg.scope,
    state,
  });

  const res = NextResponse.redirect(`${cfg.url}?${params}`);
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  });

  return res;
}
