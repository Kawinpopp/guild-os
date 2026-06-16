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

  const clientId = process.env.DISCORD_CLIENT_ID!;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
  const redirectUri = `${req.nextUrl.origin}/api/join/callback/discord`;

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return new NextResponse("Failed to exchange Discord token", { status: 400 });
  }

  const { access_token } = await tokenRes.json();

  const profileRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    return new NextResponse("Failed to fetch Discord profile", { status: 400 });
  }

  const profile = await profileRes.json();

  const session = signSession({
    platform_user_id: profile.id as string,
    platform: "discord",
    community_id: communityId,
    display_name: (profile.global_name ?? profile.username) as string,
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
