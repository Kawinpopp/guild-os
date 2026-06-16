import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../webhook/_lib";

export const dynamic = "force-dynamic";

type OnboardingPayload = {
  community_id: string;
  auth_user_id: string;
  platform: string;
  game: string;
  role: string;
  available_time: string[];
  play_style: string;
  goal: string;
  rank?: string;
};

type OnboardingResult = {
  time_vector?: number[];
  style_vector?: number[];
};

async function callOnboardingAI(payload: OnboardingPayload): Promise<OnboardingResult | null> {
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
    return (await res.json()) as OnboardingResult;
  } catch {
    return null;
  }
}

// POST /api/ai/onboarding
// Body: OnboardingPayload
export async function POST(req: NextRequest) {
  const body: OnboardingPayload = await req.json().catch(() => null);

  if (!body?.community_id || !body?.auth_user_id || !body?.game || !body?.role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Upsert a user record for the admin using auth_user_id as platform_user_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        platform_user_id: body.auth_user_id,
        platform_type: body.platform,
        display_name: "Admin",
        onboarding_completed: false,
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
      { community_id: body.community_id, user_id: user.id, role: "admin" },
      { onConflict: "community_id,user_id" },
    );

  // Optionally call AI to get vectors
  const aiResult = await callOnboardingAI(body);

  // Upsert skill card
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

  // Mark user as onboarding_completed
  await supabase.from("users").update({ onboarding_completed: true }).eq("id", user.id);

  return NextResponse.json({ ok: true, user_id: user.id });
}
