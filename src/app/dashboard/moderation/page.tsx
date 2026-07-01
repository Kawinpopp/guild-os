"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, RefreshCw, Shield, Clock, Target } from "lucide-react";

type ModerationItem = {
  id: string;
  label: string;
  confidence_score: number;
  action_taken: string;
  requires_review: boolean;
  created_at: string;
  posts: { content_preview: string | null; is_blocked: boolean } | null;
  users: { display_name: string; platform_type: string } | null;
  human_reviews: Array<{ id: string; decision: string | null; reviewed_at: string | null }>;
};

type Filter = "pending" | "reviewed" | "all";

const AVG_REVIEW_SECONDS_PER_POST = 30;

const LABEL_COLOR: Record<string, string> = {
  spam: "bg-destructive/15 text-destructive",
  toxic: "bg-orange-500/15 text-orange-400",
  sell_id: "bg-red-700/15 text-red-400",
  normal: "bg-muted text-muted-foreground",
};

const ACTION_COLOR: Record<string, string> = {
  remove: "text-destructive",
  warn: "text-warning",
  mute: "text-orange-400",
  pass: "text-muted-foreground",
};

export default function Moderation() {
  const { data: community } = useCommunity();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<ModerationItem | null>(null);
  const [loading, setLoading] = useState(false);

  // 30-day metrics for KPI cards
  const [stats30d, setStats30d] = useState({
    timeSavedHours: 0,
    spamBlocked: 0,
    avgConfidence: 0,
  });

  const load = async () => {
    if (!community) return;
    setLoading(true);
    const { data } = await supabase
      .from("moderation_logs")
      .select(
        `
        id, label, confidence_score, action_taken, requires_review, created_at,
        posts(content_preview, is_blocked),
        users(display_name, platform_type),
        human_reviews(id, decision, reviewed_at)
      `,
      )
      .eq("community_id", community.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as unknown as ModerationItem[]);
    setLoading(false);
  };

  // Load 30-day aggregates (for Time Saved + Accuracy)
  const loadStats = async () => {
    if (!community) return;
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("moderation_logs")
      .select("action_taken, confidence_score")
      .eq("community_id", community.id)
      .gte("created_at", since30d);

    const rows = data ?? [];
    const removed = rows.filter((r) => r.action_taken === "remove").length;
    const timeSavedHours = +((removed * AVG_REVIEW_SECONDS_PER_POST) / 3600).toFixed(1);

    const scores = rows.map((r) => r.confidence_score).filter((s) => s != null);
    const avgConfidence =
      scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : 0;

    setStats30d({
      timeSavedHours,
      spamBlocked: removed,
      avgConfidence,
    });
  };

  useEffect(() => {
    load();
    loadStats();
  }, [community]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!community) return;
    const channel = supabase
      .channel(`mod-${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moderation_logs",
          filter: `community_id=eq.${community.id}`,
        },
        () => {
          load();
          loadStats();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [community]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitReview = async (logId: string, decision: "confirm" | "override" | "ignore") => {
    const { error } = await supabase.from("human_reviews").insert({
      moderation_log_id: logId,
      decision,
      reviewed_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const reviewedAt = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) =>
        item.id === logId
          ? { ...item, human_reviews: [{ id: "", decision, reviewed_at: reviewedAt }] }
          : item,
      ),
    );
    if (selected?.id === logId) setSelected(null);
    toast.success(
      decision === "confirm"
        ? "ยืนยันการดำเนินการแล้ว"
        : decision === "override"
          ? "Override แล้ว"
          : "ข้ามแล้ว",
    );
  };

  const isReviewed = (item: ModerationItem) =>
    (item.human_reviews?.length ?? 0) > 0 && item.human_reviews![0].decision != null;

  const filtered = items.filter((item) => {
    if (filter === "pending") return item.requires_review && !isReviewed(item);
    if (filter === "reviewed") return isReviewed(item);
    return true;
  });

  const counts = {
    pending: items.filter((i) => i.requires_review && !isReviewed(i)).length,
    reviewed: items.filter(isReviewed).length,
  };

  const FILTERS: { k: Filter; label: string }[] = [
    { k: "pending", label: `Pending Review${filter === "pending" ? ` (${counts.pending})` : ""}` },
    { k: "reviewed", label: "Reviewed" },
    { k: "all", label: "All" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl mb-1">AI Moderation</h1>
          <p className="text-sm text-muted-foreground">ตรวจจับและจัดการโพสต์ที่ไม่เหมาะสมด้วย AI</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            load();
            loadStats();
          }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Stats row — 5 cards (3 existing + 2 new KPI) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Existing 3 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Needs Review</span>
            <Shield size={14} className="text-warning" />
          </div>
          <div className="font-display text-3xl font-bold text-warning">{counts.pending}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Reviewed</span>
            <Check size={14} className="text-accent" />
          </div>
          <div className="font-display text-3xl font-bold text-accent">{counts.reviewed}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Total Flagged</span>
            <X size={14} className="text-destructive" />
          </div>
          <div className="font-display text-3xl font-bold text-destructive">{items.length}</div>
        </div>

        {/* NEW: Time Saved KPI */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Time Saved</span>
            <Clock size={14} className="text-primary" />
          </div>
          <div className="font-display text-3xl font-bold text-primary">
            {stats30d.timeSavedHours}
            <span className="text-base ml-1 text-muted-foreground">ชม.</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            จาก {stats30d.spamBlocked} โพสต์ · 30 วัน
          </div>
        </div>

        {/* NEW: AI Accuracy KPI */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">AI Confidence</span>
            <Target size={14} className="text-accent" />
          </div>
          <div className="font-display text-3xl font-bold text-accent">
            {stats30d.avgConfidence}
            <span className="text-base ml-1 text-muted-foreground">%</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">ค่าเฉลี่ย · 30 วัน</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border pb-px">
        {FILTERS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`px-4 py-2 text-sm rounded-t-md transition ${
              filter === f.k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            ✅ ไม่มีโพสต์ที่ต้องดำเนินการ
          </div>
        )}
        <ul className="divide-y divide-border">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="px-5 py-4 flex items-start gap-4 hover:bg-background/40 transition"
            >
              <div
                className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold border ${
                  item.confidence_score >= 0.85
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : item.confidence_score >= 0.6
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                <span>{Math.round(item.confidence_score * 100)}</span>
                <span className="text-[9px] font-normal">score</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{item.users?.display_name ?? "—"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {item.users?.platform_type ?? "—"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${
                      LABEL_COLOR[item.label] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border border-border font-semibold ${ACTION_COLOR[item.action_taken] ?? ""}`}
                  >
                    AI: {item.action_taken}
                  </span>
                  {isReviewed(item) && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent font-semibold">
                      {item.human_reviews?.[0]?.decision}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.posts?.content_preview ?? "—"}
                </p>
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                  {new Date(item.created_at).toLocaleString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelected(item)}
                  className="p-2 rounded hover:bg-muted transition"
                  title="ดูเนื้อหา"
                >
                  <Eye size={15} className="text-muted-foreground" />
                </button>
                {item.requires_review && !isReviewed(item) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-accent/40 text-accent hover:bg-accent/10"
                      onClick={() => submitReview(item.id, "confirm")}
                    >
                      <Check size={13} /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => submitReview(item.id, "override")}
                    >
                      <X size={13} /> Override
                    </Button>
                  </>
                )}
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
              <h2 className="text-xl font-display font-bold">Post Detail</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Author</div>
              <div className="font-semibold">{selected.users?.display_name ?? "—"}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Content</div>
              <div className="rounded-lg bg-background border border-border p-4 text-sm leading-relaxed">
                {selected.posts?.content_preview ?? "—"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Platform</div>
                <div>{selected.users?.platform_type ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Label</div>
                <div className="capitalize">{selected.label}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">AI Score</div>
                <div
                  className={`font-bold ${
                    selected.confidence_score >= 0.85 ? "text-destructive" : "text-warning"
                  }`}
                >
                  {(selected.confidence_score * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">AI Action</div>
                <div
                  className={`capitalize font-semibold ${ACTION_COLOR[selected.action_taken] ?? ""}`}
                >
                  {selected.action_taken}
                </div>
              </div>
              {isReviewed(selected) && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground mb-1">Human Decision</div>
                  <div className="capitalize font-semibold text-accent">
                    {selected.human_reviews?.[0]?.decision}
                  </div>
                </div>
              )}
            </div>

            {selected.requires_review && !isReviewed(selected) && (
              <div className="flex gap-3 mt-auto">
                <Button
                  variant="outline"
                  className="flex-1 border-accent/40 text-accent hover:bg-accent/10"
                  onClick={() => submitReview(selected.id, "confirm")}
                >
                  <Check size={14} /> Confirm AI
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-warning/40 text-warning hover:bg-warning/10"
                  onClick={() => submitReview(selected.id, "ignore")}
                >
                  Ignore
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => submitReview(selected.id, "override")}
                >
                  <X size={14} /> Override
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
