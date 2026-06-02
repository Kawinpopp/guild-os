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

export async function saveMessage(
  token: string,
  platformUserId: string,
  content: string,
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
        platform_type: community.platform,
        display_name: platformUserId,
      },
      { onConflict: "platform_user_id" },
    )
    .select("id")
    .single();

  if (userError || !user) return { ok: false, status: 500, error: "Failed to resolve user" };

  await supabase.from("posts").insert({
    community_id: community.id,
    user_id: user.id,
    content_type: "post",
    content_preview: content.slice(0, 500),
  });

  return { ok: true };
}
