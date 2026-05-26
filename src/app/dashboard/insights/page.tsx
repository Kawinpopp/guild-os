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
  teams: number;
};

type TopMember = {
  nickname: string;
  engagement_score: number;
  persona_tag: string | null;
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
  const [totals, setTotals] = useState({ members: 0, posts: 0, removed: 0, teams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community) return;
    const id = community.id;

    const load = async () => {
      setLoading(true);

      // Build last-7-days buckets
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
          teams: 0,
        };
      });

      const since = days[0].date;

      const [membersRes, postsRes, removedRes, teamsRes, topRes, countRes] =
        await Promise.all([
          supabase
            .from("members")
            .select("created_at")
            .eq("community_id", id)
            .gte("created_at", since),
          supabase
            .from("flagged_posts")
            .select("created_at")
            .eq("community_id", id)
            .gte("created_at", since),
          supabase
            .from("flagged_posts")
            .select("created_at")
            .eq("community_id", id)
            .eq("status", "removed")
            .gte("created_at", since),
          supabase
            .from("teams")
            .select("created_at")
            .eq("community_id", id)
            .gte("created_at", since),
          supabase
            .from("members")
            .select("nickname, engagement_score, persona_tag")
            .eq("community_id", id)
            .order("engagement_score", { ascending: false })
            .limit(5),
          supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("community_id", id),
        ]);

      const bucket = (iso: string) => {
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      };

      const dayMap = Object.fromEntries(days.map((d) => [bucket(d.date), d]));

      (membersRes.data ?? []).forEach((r) => {
        const b = bucket(r.created_at);
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
      (teamsRes.data ?? []).forEach((r) => {
        const b = bucket(r.created_at);
        if (dayMap[b]) dayMap[b].teams++;
      });

      setStats(days);
      setTopMembers((topRes.data ?? []) as TopMember[]);
      setTotals({
        members: countRes.count ?? 0,
        posts: postsRes.data?.length ?? 0,
        removed: removedRes.data?.length ?? 0,
        teams: teamsRes.data?.length ?? 0,
      });
      setLoading(false);
    };

    load();
  }, [community]);

  const maxPosts = Math.max(...stats.map((d) => d.posts), 1);
  const maxTeams = Math.max(...stats.map((d) => d.teams), 1);
  const maxMembers = Math.max(...stats.map((d) => d.members), 1);

  const summary = [
    { label: "Total Members", value: totals.members, icon: Users, color: "text-primary" },
    { label: "Posts Flagged (7d)", value: totals.posts, icon: Shield, color: "text-warning" },
    { label: "Posts Removed (7d)", value: totals.removed, icon: Shield, color: "text-destructive" },
    { label: "Teams Formed (7d)", value: totals.teams, icon: Swords, color: "text-accent" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Insights</h1>
        <p className="text-sm text-muted-foreground">
          ภาพรวมสถิติชุมชน 7 วันล่าสุด
        </p>
      </div>

      {/* Summary cards */}
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

      {/* Flagged posts chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={16} className="text-warning" />
          <h2 className="text-lg">Flagged Posts (7 วัน)</h2>
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

      {/* Teams chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Swords size={16} className="text-accent" />
          <h2 className="text-lg">Teams Formed (7 วัน)</h2>
        </div>
        <div className="flex items-end gap-2">
          {stats.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <BarGroup value={d.teams} max={maxTeams} color="bg-accent/60" />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* New members chart */}
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

      {/* Top members leaderboard */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h2 className="text-lg">Top Members by Engagement</h2>
        </div>
        <ul className="divide-y divide-border">
          {topMembers.length === 0 && (
            <li className="p-6 text-sm text-center text-muted-foreground">ยังไม่มีข้อมูล</li>
          )}
          {topMembers.map((m, i) => (
            <li key={m.nickname} className="px-5 py-3 flex items-center gap-4">
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
                <div className="font-semibold text-sm truncate">{m.nickname}</div>
                <div className="text-xs text-muted-foreground">{m.persona_tag ?? "Member"}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${m.engagement_score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-primary w-8 text-right">
                  {m.engagement_score}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
