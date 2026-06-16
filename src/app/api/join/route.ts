import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "../webhook/_lib";
import { verifySession, SESSION_COOKIE } from "@/lib/join-session";

export const dynamic = "force-dynamic";

type JoinBody = {
  community_id: string;
  display_name: string;
  game: string;
  role: string;
  available_time: string[];
  play_style: string;
  goal: string;
  rank?: string | null;
};

async function callAI(
  payload: object,
): Promise<{ time_vector?: number[]; style_vector?: number[] } | null> {
  const aiUrl = process.env.AI_API_URL;
  const aiSecret = process.env.AI_BOT_SECRET;
  if (!aiUrl || !aiSecret) return null;
  try {
    const res = await fetch(`${aiUrl}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": aiSecret },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body: JoinBody = await req.json().catch(() => null);

  if (
    !body?.community_id ||
    !body?.display_name ||
    !body?.game ||
    !body?.role ||
    !body?.available_time?.length ||
    !body?.play_style ||
    !body?.goal
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Read OAuth session cookie — provides real platform_user_id
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session || session.community_id !== body.community_id) {
    return NextResponse.json(
      { error: "Unauthorized — OAuth session missing or expired" },
      { status: 401 },
    );
  }

  const supabase = getSupabase();

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("id", body.community_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Upsert with real platform_user_id — links to existing webhook user if they chatted before
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        platform_user_id: session.platform_user_id,
        platform_type: session.platform,
        display_name: body.display_name,
      },
      { onConflict: "platform_user_id" },
    )
    .select("id")
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
  }

  await supabase
    .from("community_members")
    .upsert(
      { community_id: body.community_id, user_id: user.id, role: "member" },
      { onConflict: "community_id,user_id" },
    );

  const aiResult = await callAI({
    community_id: body.community_id,
    auth_user_id: user.id,
    platform: session.platform,
    game: body.game,
    role: body.role,
    available_time: body.available_time,
    play_style: body.play_style,
    goal: body.goal,
    rank: body.rank,
  });

  const { error: skillError } = await supabase.from("skill_cards").upsert(
    {
      user_id: user.id,
      community_id: body.community_id,
      game: body.game,
      role: body.role,
      available_time: body.available_time,
      play_style: body.play_style,
      goal: body.goal,
      rank: body.rank ?? null,
      time_vector: aiResult?.time_vector ?? null,
      style_vector: aiResult?.style_vector ?? null,
    },
    { onConflict: "user_id" },
  );

  if (skillError) {
    return NextResponse.json({ error: skillError.message }, { status: 500 });
  }

  await supabase.from("users").update({ onboarding_completed: true }).eq("id", user.id);

  const res = NextResponse.json({ ok: true, user_id: user.id });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
