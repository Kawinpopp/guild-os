import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../webhook/_lib";

export const dynamic = "force-dynamic";

type SkillCardRow = {
  user_id: string;
  game: string;
  role: string;
  available_time: unknown;
  play_style: string;
  goal: string;
  rank: string | null;
  time_vector: unknown;
  style_vector: unknown;
};

type MatchResult = {
  matched_user_id: string;
  game: string;
  match_score: number;
  game_score: number;
  time_score: number;
  role_score: number;
  style_score: number;
};

async function callMatchAI(
  requester: SkillCardRow,
  candidates: SkillCardRow[],
  communityId: string,
): Promise<MatchResult | null> {
  const aiUrl = process.env.MATCHMAKER_API_URL;
  const aiSecret = process.env.AI_BOT_SECRET;
  if (!aiUrl || !aiSecret) return null;
  try {
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": aiSecret },
      body: JSON.stringify({ community_id: communityId, requester, candidates }),
    });
    if (!res.ok) return null;
    return (await res.json()) as MatchResult;
  } catch {
    return null;
  }
}

// POST /api/ai/match
// Body: { community_id: string, requester_user_id: string }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { community_id, requester_user_id } = body ?? {};

  if (!community_id || !requester_user_id) {
    return NextResponse.json(
      { error: "Missing community_id or requester_user_id" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();

  // Get all skill cards for the community
  const { data: cards, error: cardsError } = await supabase
    .from("skill_cards")
    .select(
      "user_id, game, role, available_time, play_style, goal, rank, time_vector, style_vector",
    )
    .eq("community_id", community_id);

  if (cardsError || !cards || cards.length < 2) {
    return NextResponse.json({ error: "Not enough skill cards to match" }, { status: 422 });
  }

  const requesterCard = cards.find((c) => c.user_id === requester_user_id);
  if (!requesterCard) {
    return NextResponse.json({ error: "Requester has no skill card" }, { status: 404 });
  }

  // Check for an existing pending match
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("community_id", community_id)
    .eq("requester_id", requester_user_id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Requester already has a pending match" }, { status: 409 });
  }

  const candidates = cards.filter((c) => c.user_id !== requester_user_id) as SkillCardRow[];
  const result = await callMatchAI(requesterCard as SkillCardRow, candidates, community_id);

  if (!result) {
    return NextResponse.json({ error: "AI match service unavailable" }, { status: 503 });
  }

  const { data: match, error: insertError } = await supabase
    .from("matches")
    .insert({
      community_id,
      requester_id: requester_user_id,
      matched_user_id: result.matched_user_id,
      game: result.game,
      match_score: result.match_score,
      game_score: result.game_score,
      time_score: result.time_score,
      role_score: result.role_score,
      style_score: result.style_score,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ match });
}
