"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Users, Shield, MessageCircle, Swords, Activity } from "lucide-react";

type FeedItem = {
  id: string;
  label: string;
  action_taken: string;
  confidence_score: number;
  created_at: string;
  users: { display_name: string } | null;
};

export default function Overview() {
  const { data: community } = useCommunity();
  const cid = community?.id;

  const stats = useQuery({
    queryKey: ["overview-stats", cid],
    enabled: !!cid,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isoToday = today.toISOString();
      const id = cid!;
      const [members, posts, blocked, matches] = await Promise.all([
        supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("is_active", true),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .gte("created_at", isoToday),
        supabase
          .from("moderation_logs")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("action_taken", "remove")
          .gte("created_at", isoToday),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .gte("requested_at", isoToday),
      ]);
      return {
        members: members.count ?? 0,
        posts: posts.count ?? 0,
        blocked: blocked.count ?? 0,
        matches: matches.count ?? 0,
      };
    },
  });

  const [feed, setFeed] = useState<FeedItem[]>([]);

  const loadFeed = (id: string) =>
    supabase
      .from("moderation_logs")
      .select("id, label, action_taken, confidence_score, created_at, users(display_name)")
      .eq("community_id", id)
      .order("created_at", { ascending: false })
      .limit(20)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setFeed((data ?? []) as any));

  useEffect(() => {
    if (!cid) return;
    loadFeed(cid);
    const channel = supabase
      .channel(`feed-${cid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moderation_logs",
          filter: `community_id=eq.${cid}`,
        },
        () => loadFeed(cid),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cid]);

  const feedMessage = (f: FeedItem) => {
    const name = f.users?.display_name ?? "unknown";
    const score = (f.confidence_score * 100).toFixed(0);
    const actionEmoji: Record<string, string> = {
      remove: "🛡",
      warn: "⚠️",
      mute: "🔇",
      pass: "✅",
    };
    return `${actionEmoji[f.action_taken] ?? "🤖"} AI ${f.action_taken} — ${f.label} (${score}%) from ${name}`;
  };

  const cards = [
    { label: "Active Members", value: stats.data?.members ?? "—", icon: Users, color: "primary" },
    { label: "Posts Today", value: stats.data?.posts ?? "—", icon: MessageCircle, color: "accent" },
    { label: "Spam Blocked Today", value: stats.data?.blocked ?? "—", icon: Shield, color: "primary" },
    { label: "Matches Today", value: stats.data?.matches ?? "—", icon: Swords, color: "accent" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Overview</h1>
        <p className="text-sm text-muted-foreground">สถานะชุมชนของคุณแบบเรียลไทม์</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon size={16} className={c.color === "accent" ? "text-accent" : "text-primary"} />
            </div>
            <div className="font-display text-3xl md:text-4xl font-bold">
              {stats.isLoading ? "..." : c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <h2 className="text-lg">Live Moderation Feed</h2>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Realtime
          </span>
        </div>
        <ul className="divide-y divide-border">
          {feed.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground text-center">ยังไม่มีกิจกรรม</li>
          )}
          {feed.map((f) => (
            <li
              key={f.id}
              className="px-5 py-3 flex items-center justify-between text-sm hover:bg-background/40"
            >
              <span>{feedMessage(f)}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-4">
                {new Date(f.created_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
