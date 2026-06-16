import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabase } from "@/app/api/webhook/_lib";
import { verifySession, SESSION_COOKIE } from "@/lib/join-session";
import JoinChat from "./JoinChat";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ community_id: string }>;
}) {
  const { community_id } = await params;
  const supabase = getSupabase();

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, platform")
    .eq("id", community_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  // Check for valid OAuth session
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  // Redirect to OAuth if no valid session for this community
  if (!session || session.community_id !== community_id) {
    redirect(`/api/join/auth?community_id=${community_id}`);
  }

  return (
    <JoinChat
      communityId={community.id}
      communityName={community.name}
      platform={community.platform as string}
    />
  );
}
