import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
export function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  _supabase = createClient(url, key);
  return _supabase;
}

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

async function runMatch(communityId: string, requesterUserId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("community_id", communityId)
    .eq("requester_id", requesterUserId)
    .in("status", ["pending", "accepted", "expired"])
    .maybeSingle();

  if (existing) return;

  const { data: cards } = await supabase
    .from("skill_cards")
    .select(
      "user_id, game, role, available_time, play_style, goal, rank, time_vector, style_vector",
    )
    .eq("community_id", communityId);

  if (!cards || cards.length < 2) return;

  const requesterCard = cards.find((c) => c.user_id === requesterUserId);
  if (!requesterCard) return;

  const candidates = cards.filter((c) => c.user_id !== requesterUserId) as SkillCardRow[];
  const result = await callMatchAI(requesterCard as SkillCardRow, candidates, communityId);
  if (!result) return;

  await supabase.from("matches").insert({
    community_id: communityId,
    requester_id: requesterUserId,
    matched_user_id: result.matched_user_id,
    game: result.game,
    match_score: result.match_score,
    game_score: result.game_score,
    time_score: result.time_score,
    role_score: result.role_score,
    style_score: result.style_score,
    status: "pending",
  });
}

type ModerateResult = {
  label: string;
  confidence_score: number;
  action_taken: string;
  requires_review: boolean;
  model_version: string;
  threshold_used: number;
};

async function callModerate(
  content: string,
  communityId: string,
  userId: string,
  postId: string,
): Promise<ModerateResult | null> {
  const aiUrl = process.env.MODERATOR_API_URL;
  const aiSecret = process.env.AI_BOT_SECRET;
  if (!aiUrl || !aiSecret) return null;
  try {
    const res = await fetch(`${aiUrl}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bot-secret": aiSecret },
      body: JSON.stringify({
        content,
        community_id: communityId,
        user_id: userId,
        post_id: postId,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ModerateResult;
  } catch {
    return null;
  }
}

export async function saveMessage(
  token: string,
  platformUserId: string,
  content: string,
  platform: "facebook" | "discord" | "line",
) {
  if (!content) return { ok: true };

  const supabase = getSupabase();

  const { data: community, error } = await supabase
    .from("communities")
    .select("id, platform")
    .eq("platform_group_id", token)
    .single();

  if (error || !community) return { ok: false, status: 404, error: "Community not found" };

  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        platform_user_id: platformUserId,
        platform_type: platform,
        display_name: platformUserId,
      },
      { onConflict: "platform_user_id" },
    )
    .select("id")
    .single();

  if (userError || !user) return { ok: false, status: 500, error: "Failed to resolve user" };

  await supabase
    .from("community_members")
    .upsert(
      { community_id: community.id, user_id: user.id, role: "member" },
      { onConflict: "community_id,user_id" },
    );

  const { data: post } = await supabase
    .from("posts")
    .insert({
      community_id: community.id,
      user_id: user.id,
      content_type: "post",
      content_preview: content.slice(0, 500),
    })
    .select("id")
    .single();

  if (post) {
    const mod = await callModerate(content, community.id, user.id, post.id);
    if (mod) {
      await supabase.from("moderation_logs").insert({
        community_id: community.id,
        post_id: post.id,
        user_id: user.id,
        label: mod.label,
        confidence_score: mod.confidence_score,
        action_taken: mod.action_taken,
        model_version: mod.model_version,
        threshold_used: mod.threshold_used,
        requires_review: mod.requires_review,
      });

      if (mod.action_taken === "remove") {
        await supabase.from("posts").update({ is_blocked: true }).eq("id", post.id);
      }

      if (mod.action_taken === "warn") {
        await supabase.rpc("increment_warning" as never, { p_user_id: user.id });
      }

      if (mod.label === "matching_request") {
        await runMatch(community.id, user.id);
      }
    }
  }

  return { ok: true };
}
