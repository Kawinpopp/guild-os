"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Users, Shield, MessageCircle, Swords, Activity } from "lucide-react";

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
      const [members, posts, removed, teams] = await Promise.all([
        supabase
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id),
        supabase
          .from("flagged_posts")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .gte("created_at", isoToday),
        supabase
          .from("flagged_posts")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("status", "removed")
          .gte("created_at", isoToday),
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .gte("created_at", isoToday),
      ]);
      return {
        members: members.count ?? 0,
        posts: posts.count ?? 0,
        removed: removed.count ?? 0,
        teams: teams.count ?? 0,
      };
    },
  });

  const [feed, setFeed] = useState<
    Array<{ id: string; type: string; message: string; created_at: string }>
  >([]);

  useEffect(() => {
    if (!cid) return;
    supabase
      .from("activity_feed")
      .select("*")
      .eq("community_id", cid)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setFeed(data ?? []));
    const channel = supabase
      .channel(`feed-${cid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_feed",
          filter: `community_id=eq.${cid}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload) => setFeed((prev) => [payload.new as any, ...prev].slice(0, 20))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cid]);

  const cards = [
    {
      label: "Active Members",
      value: stats.data?.members ?? "—",
      icon: Users,
      color: "primary",
    },
    {
      label: "Posts Today",
      value: stats.data?.posts ?? "—",
      icon: MessageCircle,
      color: "accent",
    },
    {
      label: "Spam Blocked Today",
      value: stats.data?.removed ?? "—",
      icon: Shield,
      color: "primary",
    },
    {
      label: "Matches Today",
      value: stats.data?.teams ?? "—",
      icon: Swords,
      color: "accent",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Overview</h1>
        <p className="text-sm text-muted-foreground">
          สถานะชุมชนของคุณแบบเรียลไทม์
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon
                size={16}
                className={
                  c.color === "accent" ? "text-accent" : "text-primary"
                }
              />
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
          <h2 className="text-lg">Live Activity</h2>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />{" "}
            Realtime
          </span>
        </div>
        <ul className="divide-y divide-border">
          {feed.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground text-center">
              ยังไม่มีกิจกรรม
            </li>
          )}
          {feed.map((f) => (
            <li
              key={f.id}
              className="px-5 py-3 flex items-center justify-between text-sm hover:bg-background/40"
            >
              <span>{f.message}</span>
              <span className="text-xs text-muted-foreground">
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
