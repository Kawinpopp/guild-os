"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, RefreshCw, Shield } from "lucide-react";

type Post = {
  id: string;
  author: string;
  content: string;
  platform: string;
  score: number;
  category: string | null;
  status: string;
  created_at: string;
};

type Filter = "pending" | "approved" | "removed" | "all";

const CATEGORY_COLOR: Record<string, string> = {
  spam: "bg-destructive/15 text-destructive",
  hate: "bg-orange-500/15 text-orange-400",
  toxic: "bg-warning/15 text-warning",
  scam: "bg-red-700/15 text-red-400",
};

export default function Moderation() {
  const { data: community } = useCommunity();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!community) return;
    setLoading(true);
    let q = supabase
      .from("flagged_posts")
      .select("*")
      .eq("community_id", community.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setPosts((data ?? []) as Post[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [community, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!community) return;
    const channel = supabase
      .channel(`mod-${community.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "flagged_posts",
          filter: `community_id=eq.${community.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload) => setPosts((prev) => [payload.new as any, ...prev]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [community]);

  const setStatus = async (id: string, status: "approved" | "removed") => {
    const { error } = await supabase.from("flagged_posts").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) =>
      filter === "all"
        ? prev.map((p) => (p.id === id ? { ...p, status } : p))
        : prev.filter((p) => p.id !== id),
    );
    if (selected?.id === id) setSelected(null);
    if (status === "removed") {
      await supabase.from("activity_feed").insert({
        community_id: community!.id,
        type: "moderation",
        message: `🛡 ลบโพสต์ spam จาก ${posts.find((p) => p.id === id)?.author ?? "unknown"}`,
      });
    }
    toast.success(status === "approved" ? "อนุมัติแล้ว" : "ลบแล้ว");
  };

  const counts = {
    pending: posts.filter((p) => p.status === "pending").length,
    approved: posts.filter((p) => p.status === "approved").length,
    removed: posts.filter((p) => p.status === "removed").length,
  };

  const FILTERS: { k: Filter; label: string }[] = [
    { k: "pending", label: `Pending${filter !== "pending" ? "" : ` (${counts.pending})`}` },
    { k: "approved", label: "Approved" },
    { k: "removed", label: "Removed" },
    { k: "all", label: "All" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl mb-1">AI Moderation</h1>
          <p className="text-sm text-muted-foreground">ตรวจจับและจัดการโพสต์ที่ไม่เหมาะสมด้วย AI</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: counts.pending, color: "text-warning", icon: Shield },
          { label: "Approved Today", value: counts.approved, color: "text-accent", icon: Check },
          { label: "Removed Today", value: counts.removed, color: "text-destructive", icon: X },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon size={14} className={s.color} />
            </div>
            <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
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

      {/* Posts list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        )}
        {!loading && posts.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            ✅ ไม่มีโพสต์ที่ต้องดำเนินการ
          </div>
        )}
        <ul className="divide-y divide-border">
          {posts.map((p) => (
            <li
              key={p.id}
              className="px-5 py-4 flex items-start gap-4 hover:bg-background/40 transition"
            >
              {/* Score badge */}
              <div
                className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold border ${
                  p.score >= 0.85
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : p.score >= 0.6
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-border bg-background text-muted-foreground"
                }`}
              >
                <span>{Math.round(p.score * 100)}</span>
                <span className="text-[9px] font-normal">score</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{p.author}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {p.platform}
                  </span>
                  {p.category && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${
                        CATEGORY_COLOR[p.category] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.category}
                    </span>
                  )}
                  {p.status !== "pending" && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        p.status === "approved"
                          ? "bg-accent/15 text-accent"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {p.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                  {new Date(p.created_at).toLocaleString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setSelected(p)}
                  className="p-2 rounded hover:bg-muted transition"
                  title="ดูเนื้อหา"
                >
                  <Eye size={15} className="text-muted-foreground" />
                </button>
                {p.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-accent/40 text-accent hover:bg-accent/10"
                      onClick={() => setStatus(p.id, "approved")}
                    >
                      <Check size={13} /> อนุมัติ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setStatus(p.id, "removed")}
                    >
                      <X size={13} /> ลบ
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail drawer */}
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
              <div className="font-semibold">{selected.author}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Content</div>
              <div className="rounded-lg bg-background border border-border p-4 text-sm leading-relaxed">
                {selected.content}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Platform</div>
                <div>{selected.platform}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Category</div>
                <div className="capitalize">{selected.category ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">AI Score</div>
                <div
                  className={`font-bold ${
                    selected.score >= 0.85 ? "text-destructive" : "text-warning"
                  }`}
                >
                  {(selected.score * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="capitalize">{selected.status}</div>
              </div>
            </div>

            {selected.status === "pending" && (
              <div className="flex gap-3 mt-auto">
                <Button
                  variant="outline"
                  className="flex-1 border-accent/40 text-accent hover:bg-accent/10"
                  onClick={() => setStatus(selected.id, "approved")}
                >
                  <Check size={14} /> อนุมัติ
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setStatus(selected.id, "removed")}
                >
                  <X size={14} /> ลบโพสต์
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
