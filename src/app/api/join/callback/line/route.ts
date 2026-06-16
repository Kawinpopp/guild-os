import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, NONCE_COOKIE } from "@/lib/join-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const nonce = req.cookies.get(NONCE_COOKIE)?.value;

  if (!code || !state || !nonce) {
    return new NextResponse("Invalid OAuth callback", { status: 400 });
  }

  let communityId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
    if (parsed.nonce !== nonce) throw new Error("nonce mismatch");
    communityId = parsed.community_id;
  } catch {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET!;
  const redirectUri = `${req.nextUrl.origin}/api/join/callback/line`;

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return new NextResponse("Failed to exchange LINE token", { status: 400 });
  }

  const { access_token } = await tokenRes.json();

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    return new NextResponse("Failed to fetch LINE profile", { status: 400 });
  }

  const profile = await profileRes.json();

  const session = signSession({
    platform_user_id: profile.userId as string,
    platform: "line",
    community_id: communityId,
    display_name: profile.displayName as string,
  });

  const res = NextResponse.redirect(`${req.nextUrl.origin}/join/${communityId}`);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: 3600,
    path: "/",
    sameSite: "lax",
  });
  res.cookies.delete(NONCE_COOKIE);

  return res;
}
