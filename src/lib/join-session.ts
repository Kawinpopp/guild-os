import { createHmac } from "crypto";

export interface JoinSession {
  platform_user_id: string;
  platform: string;
  community_id: string;
  display_name: string;
}

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret";
}

export function signSession(data: JoinSession): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string): JoinSession | null {
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 0) return null;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as JoinSession;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "guild_join";
export const NONCE_COOKIE = "guild_join_nonce";
