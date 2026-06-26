"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  MessageCircle,
  Swords,
  Activity,
  Clock,
  TrendingUp,
  Flame,
  Star,
  FileDown,
} from "lucide-react";

type FeedItem = {
  id: string;
  label: string;
  action_taken: string;
  confidence_score: number;
  created_at: string;
  users: { display_name: string } | null;
};

const AVG_REVIEW_SECONDS_PER_POST = 30;
const PDF_API_URL = process.env.NEXT_PUBLIC_PDF_API_URL || "http://localhost:8000";

export default function Overview() {
  const { data: community } = useCommunity();
  const cid = community?.id;
  const [exporting, setExporting] = useState(false);

  const stats = useQuery({
    queryKey: ["overview-stats", cid],
    enabled: !!cid,
    queryFn: async () => {
      const now = new Date();
      const iso7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const iso30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const id = cid!;

      const [
        totalMembers,
        activeMembers,
        spam30d,
        posts7d,
        matches7d,
        matchesAccepted7d,
        peakHourData,
        ratings30d,
      ] = await Promise.all([
        supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("is_active", true),
        supabase.from("posts").select("user_id").eq("community_id", id).gte("created_at", iso7d),
        supabase
          .from("moderation_logs")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("action_taken", "remove")
          .gte("created_at", iso30d),
        supabase
          .from("posts")
          .select("id, created_at", { count: "exact" })
          .eq("community_id", id)
          .gte("created_at", iso7d),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .gte("requested_at", iso7d),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("community_id", id)
          .eq("status", "accepted")
          .gte("requested_at", iso7d),
        supabase
          .from("posts")
          .select("created_at")
          .eq("community_id", id)
          .gte("created_at", iso30d),
        supabase.from("match_ratings").select("rating").gte("created_at", iso30d),
      ]);

      const activeIds = new Set((activeMembers.data ?? []).map((r) => r.user_id));
      const activeCount = activeIds.size;

      const postsCount = posts7d.count ?? 0;
      const avgPostsPerDay = Math.round(postsCount / 7);

      const spamCount = spam30d.count ?? 0;
      const timeSavedHours = +((spamCount * AVG_REVIEW_SECONDS_PER_POST) / 3600).toFixed(1);

      const matchesTotal = matches7d.count ?? 0;
      const matchesOk = matchesAccepted7d.count ?? 0;
      const acceptanceRate = matchesTotal > 0 ? Math.round((matchesOk / matchesTotal) * 100) : 0;

      const hourCounts: Record<number, number> = {};
      (peakHourData.data ?? []).forEach((row) => {
        const h = new Date(row.created_at).getHours();
        hourCounts[h] = (hourCounts[h] ?? 0) + 1;
      });
      let peakHour = -1;
      let peakCount = 0;
      for (const [h, c] of Object.entries(hourCounts)) {
        if (c > peakCount) {
          peakCount = c;
          peakHour = parseInt(h);
        }
      }
      const peakHourLabel = peakHour >= 0 ? `${String(peakHour).padStart(2, "0")}:00` : "—";

      const ratings = (ratings30d.data ?? []).map((r) => r.rating);
      const avgRating =
        ratings.length > 0
          ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
          : null;

      const totalCount = totalMembers.count ?? 0;
      const activeRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

      return {
        timeSavedHours,
        spamBlocked30d: spamCount,
        totalMembers: totalCount,
        activeMembers: activeCount,
        activeRate,
        avgPostsPerDay,
        peakHour: peakHourLabel,
        matchesTotal,
        acceptanceRate,
        avgRating,
        ratingsCount: ratings.length,
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

  // ===== Export PDF =====
  const handleExportPdf = async () => {
    if (!community) {
      toast.error("ยังไม่มีข้อมูลชุมชน");
      return;
    }
    setExporting(true);
    const toastId = toast.loading("กำลังสร้าง PDF... (อาจใช้เวลาสักครู่)");

    try {
      const res = await fetch(`${PDF_API_URL}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: community.id,
          community_name: community.name ?? "Community",
          report_period: new Date().toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      // Get PDF blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GuildOS_Sponsor_Report_${community.name ?? "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("ดาวน์โหลด PDF สำเร็จ!", { id: toastId });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(`สร้าง PDF ไม่สำเร็จ: ${err instanceof Error ? err.message : "unknown"}`, {
        id: toastId,
      });
    } finally {
      setExporting(false);
    }
  };

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

  const heroCards = [
    {
      label: "ชั่วโมงประหยัด",
      sub: "AI ช่วยกรอง · 30 วัน",
      value: stats.data ? `${stats.data.timeSavedHours} ชม.` : "—",
      icon: Clock,
      color: "primary",
    },
    {
      label: "Spam Blocked",
      sub: "30 วันล่าสุด",
      value: stats.data?.spamBlocked30d ?? "—",
      icon: Shield,
      color: "accent",
    },
    {
      label: "Total Members",
      sub: "สมาชิกทั้งหมด",
      value: stats.data?.totalMembers ?? "—",
      icon: Users,
      color: "primary",
    },
    {
      label: "Active Members",
      sub: stats.data ? `${stats.data.activeRate}% ของทั้งหมด · 7 วัน` : "7 วันล่าสุด",
      value: stats.data?.activeMembers ?? "—",
      icon: Flame,
      color: "accent",
    },
  ];

  const secondaryCards = [
    {
      label: "Posts / Day",
      sub: "เฉลี่ย 7 วัน",
      value: stats.data?.avgPostsPerDay ?? "—",
      icon: MessageCircle,
    },
    {
      label: "Peak Hour",
      sub: "ช่วงเวลาทอง · 30 วัน",
      value: stats.data?.peakHour ?? "—",
      icon: TrendingUp,
    },
    {
      label: "Matches",
      sub: stats.data ? `${stats.data.acceptanceRate}% accept · 7 วัน` : "7 วันล่าสุด",
      value: stats.data?.matchesTotal ?? "—",
      icon: Swords,
    },
    {
      label: "Avg Rating",
      sub: stats.data?.ratingsCount ? `จาก ${stats.data.ratingsCount} reviews` : "30 วันล่าสุด",
      value:
        stats.data?.avgRating !== null && stats.data?.avgRating !== undefined
          ? `${stats.data.avgRating} / 5`
          : "—",
      icon: Star,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl mb-1">Overview</h1>
          <p className="text-sm text-muted-foreground">สถานะชุมชนของคุณแบบเรียลไทม์</p>
        </div>
        <Button
          variant="hero"
          size="sm"
          onClick={handleExportPdf}
          disabled={exporting || !community}
        >
          <FileDown size={15} className={exporting ? "animate-pulse" : ""} />
          {exporting ? "กำลังสร้าง..." : "Export PDF"}
        </Button>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {heroCards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{c.label}</span>
              <c.icon size={16} className={c.color === "accent" ? "text-accent" : "text-primary"} />
            </div>
            <div className="font-display text-3xl md:text-4xl font-bold mb-1">
              {stats.isLoading ? "..." : c.value}
            </div>
            <div className="text-xs text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div>
        <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
          Additional Metrics
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryCards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon size={14} className="text-muted-foreground" />
              </div>
              <div className="font-display text-2xl font-semibold mb-1">
                {stats.isLoading ? "..." : c.value}
              </div>
              <div className="text-[11px] text-muted-foreground">{c.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Moderation Feed */}
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
