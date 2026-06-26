"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { RefreshCw, Swords, Check, X, Play, Star, TrendingUp } from "lucide-react";

type MatchItem = {
  id: string;
  game: string;
  match_score: number;
  game_score: number;
  time_score: number;
  role_score: number;
  style_score: number;
  status: string;
  requested_at: string;
  responded_at: string | null;
  requester: { display_name: string } | null;
  matched_user: { display_name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  accepted: "bg-accent/15 text-accent",
  rejected: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-primary">{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="h-1.5 bg-background rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-primary to-accent"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

export default function Matchmaking() {
  const { data: community } = useCommunity();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [selected, setSelected] = useState<MatchItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(false);
  const [running, setRunning] = useState(false);

  // KPI #8: Avg Match Rating (30 days)
  const [ratingStats, setRatingStats] = useState({
    avgRating: null as number | null,
    totalReviews: 0,
  });

  const fetchMatches = async (communityId: string) => {
    const { data } = await supabase
      .from("matches")
      .select(
        `
        id, game, match_score, game_score, time_score, role_score, style_score,
        status, requested_at, responded_at,
        requester:users!matches_requester_id_fkey(display_name),
        matched_user:users!matches_matched_user_id_fkey(display_name)
      `,
      )
      .eq("community_id", communityId)
      .order("requested_at", { ascending: false })
      .limit(100);
    setMatches((data ?? []) as unknown as MatchItem[]);
  };

  // Load match_ratings (30 days)
  const fetchRatings = async () => {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("match_ratings")
      .select("rating")
      .gte("created_at", since30d);

    const ratings = (data ?? []).map((r) => r.rating);
    const avg =
      ratings.length > 0 ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    setRatingStats({
      avgRating: avg,
      totalReviews: ratings.length,
    });
  };

  const refresh = async () => {
    if (!community) return;
    setLoading(true);
    await Promise.all([fetchMatches(community.id), fetchRatings()]);
    setLoading(false);
  };

  const runMatchmaker = async () => {
    if (!community) return;
    setRunning(true);

    const [{ data: cards }, { data: pendingMatches }] = await Promise.all([
      supabase.from("skill_cards").select("user_id").eq("community_id", community.id),
      supabase
        .from("matches")
        .select("requester_id")
        .eq("community_id", community.id)
        .in("status", ["pending", "accepted", "expired"]),
    ]);

    if (!cards || cards.length < 2) {
      toast.error("ต้องการ Skill Card อย่างน้อย 2 ใบเพื่อจับคู่");
      setRunning(false);
      return;
    }

    const pendingIds = new Set((pendingMatches ?? []).map((m) => m.requester_id));
    const toMatch = cards.filter((c) => !pendingIds.has(c.user_id));

    if (toMatch.length === 0) {
      toast.info("ทุกคนมี pending match อยู่แล้ว");
      setRunning(false);
      return;
    }

    let created = 0;
    for (const card of toMatch) {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: community.id,
          requester_user_id: card.user_id,
        }),
      });
      if (res.ok) created++;
    }

    setRunning(false);
    if (created > 0) {
      toast.success(`สร้างการจับคู่ใหม่ ${created} คู่`);
      await fetchMatches(community.id);
    } else {
      toast.info("ไม่มีการจับคู่ใหม่");
    }
  };

  const respond = async (matchId: string, decision: "accepted" | "rejected") => {
    setResponding(true);
    const { error } = await supabase
      .from("matches")
      .update({ status: decision, responded_at: new Date().toISOString() })
      .eq("id", matchId);
    if (error) {
      toast.error("เกิดข้อผิดพลาด");
    } else {
      toast.success(decision === "accepted" ? "รับการจับคู่แล้ว" : "ปฏิเสธการจับคู่แล้ว");
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, status: decision, responded_at: new Date().toISOString() } : m,
        ),
      );
      setSelected((prev) =>
        prev?.id === matchId
          ? { ...prev, status: decision, responded_at: new Date().toISOString() }
          : prev,
      );
    }
    setResponding(false);
  };

  useEffect(() => {
    if (!community) return;
    fetchMatches(community.id);
    fetchRatings();

    const channel = supabase
      .channel(`matches:${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `community_id=eq.${community.id}`,
        },
        () => fetchMatches(community.id),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [community]);

  const filtered = filter === "all" ? matches : matches.filter((m) => m.status === filter);

  const counts = {
    pending: matches.filter((m) => m.status === "pending").length,
    accepted: matches.filter((m) => m.status === "accepted").length,
    rejected: matches.filter((m) => m.status === "rejected").length,
  };

  const totalResponded = counts.accepted + counts.rejected;
  const acceptanceRate =
    totalResponded > 0 ? Math.round((counts.accepted / totalResponded) * 100) : 0;

  const avgScore =
    matches.length > 0
      ? (matches.reduce((s, m) => s + m.match_score, 0) / matches.length).toFixed(2)
      : "—";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl mb-1">Smart Matchmaker</h1>
          <p className="text-sm text-muted-foreground">
            ผลการจับคู่จาก AI Matchmaker — score คำนวณจาก game / time / role / style
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="hero" size="sm" onClick={runMatchmaker} disabled={running || loading}>
            <Play size={14} className={running ? "animate-pulse" : ""} />
            {running ? "กำลังจับคู่..." : "Run Matchmaker"}
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats — 6 cards (4 existing + 2 new KPI) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground mb-2">Pending</div>
          <div className="font-display text-3xl font-bold text-warning">{counts.pending}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground mb-2">Accepted</div>
          <div className="font-display text-3xl font-bold text-accent">{counts.accepted}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground mb-2">Rejected</div>
          <div className="font-display text-3xl font-bold text-destructive">{counts.rejected}</div>
        </div>

        {/* NEW: Acceptance Rate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Acceptance Rate</span>
            <TrendingUp size={14} className="text-accent" />
          </div>
          <div className="font-display text-3xl font-bold text-accent">
            {acceptanceRate}
            <span className="text-base ml-1 text-muted-foreground">%</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            จาก {totalResponded} ที่ตอบกลับ
          </div>
        </div>

        {/* Existing Avg Score (AI confidence) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground mb-2">Avg AI Score</div>
          <div className="font-display text-3xl font-bold text-primary">{avgScore}</div>
          <div className="text-[10px] text-muted-foreground mt-1">match_score เฉลี่ย</div>
        </div>

        {/* NEW: Avg User Rating (KPI #8) */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Avg Rating</span>
            <Star size={14} className="text-warning" />
          </div>
          <div className="font-display text-3xl font-bold text-warning">
            {ratingStats.avgRating !== null ? (
              <>
                {ratingStats.avgRating}
                <span className="text-base ml-1 text-muted-foreground">/ 5</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {ratingStats.totalReviews > 0
              ? `จาก ${ratingStats.totalReviews} reviews · 30 วัน`
              : "ยังไม่มี reviews"}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-t-md transition capitalize ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Matches list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">ยังไม่มีการจับคู่</div>
        )}
        <ul className="divide-y divide-border">
          {filtered.map((m) => (
            <li
              key={m.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-background/40 transition cursor-pointer"
              onClick={() => setSelected(m)}
            >
              <div
                className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center text-sm font-bold border ${
                  m.match_score >= 0.8
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : m.match_score >= 0.6
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                <span>{(m.match_score * 100).toFixed(0)}</span>
                <span className="text-[9px] font-normal">score</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Swords size={13} className="text-primary shrink-0" />
                  <span className="font-semibold text-sm">{m.requester?.display_name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="font-semibold text-sm">
                    {m.matched_user?.display_name ?? "—"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {m.game}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${STATUS_COLOR[m.status] ?? ""}`}
                  >
                    {m.status}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">
                  {new Date(m.requested_at).toLocaleString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail drawer (unchanged) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-md h-full bg-card border-l border-border p-6 overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold">Match Detail</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded">
                <span className="text-lg">✕</span>
              </button>
            </div>

            <div className="rounded-lg bg-background/60 border border-border p-4 flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="font-semibold">{selected.requester?.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Requester</div>
              </div>
              <div className="text-muted-foreground font-bold">vs</div>
              <div className="text-center">
                <div className="font-semibold">{selected.matched_user?.display_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Matched</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Game</div>
                <div className="font-semibold">{selected.game}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div
                  className={`inline-block text-xs px-2 py-0.5 rounded font-semibold capitalize ${STATUS_COLOR[selected.status] ?? ""}`}
                >
                  {selected.status}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Requested</div>
                <div>{new Date(selected.requested_at).toLocaleString("th-TH")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Responded</div>
                <div>
                  {selected.responded_at
                    ? new Date(selected.responded_at).toLocaleString("th-TH")
                    : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Score Breakdown
              </div>
              <ScoreBar label="Overall Match" value={selected.match_score} />
              <ScoreBar label="Game (40%)" value={selected.game_score} />
              <ScoreBar label="Time (25%)" value={selected.time_score} />
              <ScoreBar label="Role (20%)" value={selected.role_score} />
              <ScoreBar label="Style (15%)" value={selected.style_score} />
            </div>

            {selected.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={responding}
                  onClick={() => respond(selected.id, "rejected")}
                >
                  <X size={14} /> ปฏิเสธ
                </Button>
                <Button
                  className="flex-1"
                  variant="hero"
                  disabled={responding}
                  onClick={() => respond(selected.id, "accepted")}
                >
                  <Check size={14} /> รับการจับคู่
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
