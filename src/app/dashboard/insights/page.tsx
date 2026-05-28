"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { BarChart3, TrendingUp, Users, Shield, Swords } from "lucide-react";

type DayStat = {
  date: string;
  label: string;
  members: number;
  posts: number;
  removed: number;
  matches: number;
};

type TopMember = {
  display_name: string;
  warning_count: number;
  status: string;
};

function BarGroup({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[10px] text-muted-foreground">{value}</span>
      <div className="w-full bg-background rounded-t overflow-hidden" style={{ height: 80 }}>
        <div
          className={`w-full rounded-t transition-all duration-500 ${color}`}
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Insights() {
  const { data: community } = useCommunity();
  const [stats, setStats] = useState<DayStat[]>([]);
  const [topMembers, setTopMembers] = useState<TopMember[]>([]);
  const [totals, setTotals] = useState({ members: 0, posts: 0, removed: 0, matches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community) return;
    const id = community.id;

    const load = async () => {
      setLoading(true);

      const days: DayStat[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return {
          date: d.toISOString(),
          label: d.toLocaleDateString("th-TH", { day: "2-digit", month: "short" }),
          members: 0,
          posts: 0,
          removed: 0,
          matches: 0,
        };
      });

      const since = days[0].date;

      const [membersRes, postsRes, removedRes, matchesRes, topRes, countRes] = await Promise.all([
        supabase
          .from("community_members")
          .select("joined_at")
          .eq("community_id", id)
          .gte("joined_at", since),
        supabase.from("posts").select("created_at").eq("community_id", id).gte("created_at", since),
        supabase
          .from("moderation_logs")
          .select("created_at")
          .eq("community_id", id)
          .eq("action_taken", "remove")
          .gte("created_at", since),
        supabase
          .from("matches")
          .select("requested_at")
          .eq("community_id", id)
          .gte("requested_at", since),
        supabase
          .from("community_members")
          .select("users(display_name, warning_count, status)")
          .eq("community_id", id)
          .eq("is_active", true)
          .order("joined_at", { ascending: true })
          .limit(5),
        supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("is_active", true),
      ]);

      const bucket = (iso: string) => {
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      };

      const dayMap = Object.fromEntries(days.map((d) => [bucket(d.date), d]));

      (membersRes.data ?? []).forEach((r) => {
        const b = bucket(r.joined_at ?? "");
        if (dayMap[b]) dayMap[b].members++;
      });
      (postsRes.data ?? []).forEach((r) => {
        const b = bucket(r.created_at);
        if (dayMap[b]) dayMap[b].posts++;
      });
      (removedRes.data ?? []).forEach((r) => {
        const b = bucket(r.created_at);
        if (dayMap[b]) dayMap[b].removed++;
      });
      (matchesRes.data ?? []).forEach((r) => {
        const b = bucket(r.requested_at ?? "");
        if (dayMap[b]) dayMap[b].matches++;
      });

      const top = (topRes.data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => m.users)
        .filter(Boolean) as TopMember[];

      setStats(days);
      setTopMembers(top);
      setTotals({
        members: countRes.count ?? 0,
        posts: postsRes.data?.length ?? 0,
        removed: removedRes.data?.length ?? 0,
        matches: matchesRes.data?.length ?? 0,
      });
      setLoading(false);
    };

    load();
  }, [community]);

  const maxPosts = Math.max(...stats.map((d) => d.posts), 1);
  const maxMatches = Math.max(...stats.map((d) => d.matches), 1);
  const maxMembers = Math.max(...stats.map((d) => d.members), 1);

  const summary = [
    { label: "Total Members", value: totals.members, icon: Users, color: "text-primary" },
    { label: "Posts Flagged (7d)", value: totals.posts, icon: Shield, color: "text-warning" },
    { label: "Posts Removed (7d)", value: totals.removed, icon: Shield, color: "text-destructive" },
    { label: "Matches (7d)", value: totals.matches, icon: Swords, color: "text-accent" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Insights</h1>
        <p className="text-sm text-muted-foreground">ภาพรวมสถิติชุมชน 7 วันล่าสุด</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon size={15} className={s.color} />
            </div>
            <div className={`font-display text-3xl font-bold ${s.color}`}>
              {loading ? "..." : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={16} className="text-warning" />
          <h2 className="text-lg">Posts Flagged (7 วัน)</h2>
        </div>
        <div className="flex items-end gap-2">
          {stats.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <BarGroup value={d.posts} max={maxPosts} color="bg-warning/60" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Swords size={16} className="text-accent" />
          <h2 className="text-lg">Matches (7 วัน)</h2>
        </div>
        <div className="flex items-end gap-2">
          {stats.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <BarGroup value={d.matches} max={maxMatches} color="bg-accent/60" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-lg">New Members (7 วัน)</h2>
        </div>
        <div className="flex items-end gap-2">
          {stats.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <BarGroup value={d.members} max={maxMembers} color="bg-primary/60" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h2 className="text-lg">OG Members (joined earliest)</h2>
        </div>
        <ul className="divide-y divide-border">
          {topMembers.length === 0 && (
            <li className="p-6 text-sm text-center text-muted-foreground">ยังไม่มีข้อมูล</li>
          )}
          {topMembers.map((m, i) => (
            <li key={i} className="px-5 py-3 flex items-center gap-4">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0
                    ? "bg-warning/20 text-warning"
                    : i === 1
                      ? "bg-muted-foreground/15 text-muted-foreground"
                      : i === 2
                        ? "bg-orange-700/15 text-orange-400"
                        : "bg-background border border-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{m.display_name}</div>
                <div className="text-xs text-muted-foreground capitalize">{m.status}</div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  m.warning_count === 0 ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"
                }`}
              >
                {m.warning_count === 0 ? "Clean" : `${m.warning_count} warns`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
