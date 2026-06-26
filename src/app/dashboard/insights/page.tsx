"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import {
  TrendingUp,
  Users,
  Shield,
  Swords,
  MessageCircle,
  Clock,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

// Chart colors — hardcoded เพื่อให้ Recharts ใช้ได้
const CHART_COLORS = {
  primary: "#A78BFA",      // purple (matches text-primary)
  accent: "#34D399",       // emerald green (active)
  warning: "#FBBF24",      // amber
  destructive: "#F87171",  // red
  muted: "#4B5563",        // gray (inactive)
  axis: "#9CA3AF",         // light gray for labels
  grid: "#374151",         // dark gray for grid
};

type DayStat = {
  date: string;
  label: string;
  members: number;
  posts: number;
  comments: number;
  removed: number;
  matches: number;
};

type TopMember = {
  display_name: string;
  warning_count: number;
  status: string;
};

type HourStat = {
  hour: string;
  count: number;
};

export default function Insights() {
  const { data: community } = useCommunity();
  const [stats, setStats] = useState<DayStat[]>([]);
  const [hourStats, setHourStats] = useState<HourStat[]>([]);
  const [topMembers, setTopMembers] = useState<TopMember[]>([]);
  const [totals, setTotals] = useState({
    members: 0,
    active: 0,
    posts: 0,
    removed: 0,
    matches: 0,
  });
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
          comments: 0,
          removed: 0,
          matches: 0,
        };
      });

      const since7d = days[0].date;
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        membersRes,
        postsRes,
        removedRes,
        matchesRes,
        topRes,
        countRes,
        activeRes,
        hourRes,
      ] = await Promise.all([
        supabase
          .from("community_members")
          .select("joined_at")
          .eq("community_id", id)
          .gte("joined_at", since7d),
        supabase
          .from("posts")
          .select("created_at, content_type")
          .eq("community_id", id)
          .gte("created_at", since7d),
        supabase
          .from("moderation_logs")
          .select("created_at")
          .eq("community_id", id)
          .eq("action_taken", "remove")
          .gte("created_at", since7d),
        supabase
          .from("matches")
          .select("requested_at")
          .eq("community_id", id)
          .gte("requested_at", since7d),
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
        supabase
          .from("posts")
          .select("user_id")
          .eq("community_id", id)
          .gte("created_at", since7d),
        supabase
          .from("posts")
          .select("created_at")
          .eq("community_id", id)
          .gte("created_at", since30d),
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
        if (!dayMap[b]) return;
        if (r.content_type === "comment" || r.content_type === "reply") {
          dayMap[b].comments++;
        } else {
          dayMap[b].posts++;
        }
      });
      (removedRes.data ?? []).forEach((r) => {
        const b = bucket(r.created_at);
        if (dayMap[b]) dayMap[b].removed++;
      });
      (matchesRes.data ?? []).forEach((r) => {
        const b = bucket(r.requested_at ?? "");
        if (dayMap[b]) dayMap[b].matches++;
      });

      const hourCounts: Record<number, number> = {};
      (hourRes.data ?? []).forEach((row) => {
        const h = new Date(row.created_at).getHours();
        hourCounts[h] = (hourCounts[h] ?? 0) + 1;
      });
      const hours: HourStat[] = Array.from({ length: 24 }, (_, h) => ({
        hour: `${String(h).padStart(2, "0")}:00`,
        count: hourCounts[h] ?? 0,
      }));

      const activeIds = new Set((activeRes.data ?? []).map((r) => r.user_id));

      const top = (topRes.data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((m: any) => m.users)
        .filter(Boolean) as TopMember[];

      setStats(days);
      setHourStats(hours);
      setTopMembers(top);
      setTotals({
        members: countRes.count ?? 0,
        active: activeIds.size,
        posts: postsRes.data?.length ?? 0,
        removed: removedRes.data?.length ?? 0,
        matches: matchesRes.data?.length ?? 0,
      });
      setLoading(false);
    };

    load();
  }, [community]);

  const activeRate = totals.members > 0 ? Math.round((totals.active / totals.members) * 100) : 0;
  const inactive = totals.members - totals.active;

  const summary = [
    { label: "Total Members", value: totals.members, icon: Users, color: "text-primary" },
    { label: "Active (7d)", value: `${totals.active} (${activeRate}%)`, icon: Flame, color: "text-accent" },
    { label: "Posts Removed (7d)", value: totals.removed, icon: Shield, color: "text-destructive" },
    { label: "Matches (7d)", value: totals.matches, icon: Swords, color: "text-accent" },
  ];

  const donutData = [
    { name: "Active", value: totals.active },
    { name: "Inactive", value: Math.max(inactive, 0) },
  ];

  // Tooltip style ใช้ซ้ำ
  const tooltipStyle = {
    background: "#1F2937",
    border: "1px solid #374151",
    borderRadius: 8,
    fontSize: 12,
    color: "#F3F4F6",
  };

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

      {/* Posts & Comments line chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle size={16} className="text-primary" />
          <h2 className="text-lg">Posts & Comments (7 วัน)</h2>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} />
            <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.axis }} />
            <Line
              type="monotone"
              dataKey="posts"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              name="Posts"
              dot={{ r: 4, fill: CHART_COLORS.primary }}
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              name="Comments"
              dot={{ r: 4, fill: CHART_COLORS.accent }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Active donut + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Flame size={16} className="text-accent" />
            <h2 className="text-lg">Active vs Inactive</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill={CHART_COLORS.accent} />
                <Cell fill={CHART_COLORS.muted} />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.axis }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <span className="font-display text-2xl font-bold text-accent">{totals.active}</span>
            <span className="text-sm text-muted-foreground ml-2">active ({activeRate}%)</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-warning" />
            <h2 className="text-lg">Peak Activity Hours (30 วัน)</h2>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourStats}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="hour"
                stroke={CHART_COLORS.axis}
                fontSize={9}
                interval={3}
              />
              <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={CHART_COLORS.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spam Blocked */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={16} className="text-destructive" />
          <h2 className="text-lg">Spam Blocked (7 วัน)</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} />
            <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="removed" fill={CHART_COLORS.destructive} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Matches */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Swords size={16} className="text-accent" />
          <h2 className="text-lg">Matches (7 วัน)</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} />
            <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="matches" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* New Members */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-lg">New Members (7 วัน)</h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="label" stroke={CHART_COLORS.axis} fontSize={11} />
            <YAxis stroke={CHART_COLORS.axis} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="members" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* OG Members */}
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