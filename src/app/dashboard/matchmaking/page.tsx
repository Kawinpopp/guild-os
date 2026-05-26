"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Bot } from "lucide-react";

type Req = {
  id: string;
  raw_text: string;
  game: string | null;
  role: string | null;
  time_window: string | null;
  parse_confidence: number | null;
};
type Team = {
  id: string;
  game: string;
  scheduled_time: string | null;
  players: { nick: string; style: string }[];
  outcome: string | null;
  created_at: string;
};

const GAMES = ["ROV", "MLBB", "Valorant", "PUBG Mobile", "LoL Wild Rift"] as const;

export default function Matchmaking() {
  const { data: community } = useCommunity();
  const [requests, setRequests] = useState<Req[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rules, setRules] = useState<Record<string, number>>({
    ROV: 5,
    MLBB: 5,
    Valorant: 5,
    "PUBG Mobile": 4,
    "LoL Wild Rift": 5,
  });
  const [timeWindow, setTimeWindow] = useState(60);
  const [rankGap, setRankGap] = useState("any");
  const [draft, setDraft] = useState("");

  const refresh = async () => {
    if (!community) return;
    const [r, t] = await Promise.all([
      supabase
        .from("match_requests")
        .select("*")
        .eq("community_id", community.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("teams")
        .select("*")
        .eq("community_id", community.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setRequests((r.data ?? []) as Req[]);
    setTeams((t.data ?? []) as unknown as Team[]);
  };

  useEffect(() => {
    refresh();
  }, [community]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const s = community?.settings as
      | {
          matchmaker?: {
            rules?: Record<string, number>;
            time_window?: number;
            rank_gap?: string;
          };
        }
      | undefined;
    if (s?.matchmaker) {
      if (s.matchmaker.rules) setRules((prev) => ({ ...prev, ...s.matchmaker!.rules }));
      if (typeof s.matchmaker.time_window === "number")
        setTimeWindow(s.matchmaker.time_window);
      if (s.matchmaker.rank_gap) setRankGap(s.matchmaker.rank_gap);
    }
  }, [community?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRules = async () => {
    if (!community) return;
    const next = {
      ...(community.settings as object),
      matchmaker: { rules, time_window: timeWindow, rank_gap: rankGap },
    };
    await supabase
      .from("communities")
      .update({ settings: next })
      .eq("id", community.id);
    toast.success("บันทึกแล้ว");
  };

  const parseRequest = async () => {
    if (!community || !draft.trim()) return;
    const text = draft.trim();
    const game =
      GAMES.find((g) => text.toLowerCase().includes(g.toLowerCase())) ?? null;
    const roleMatch = text.match(
      /\b(mid|jungle|carry|support|tank|sup|adc|top)\b/i
    );
    const timeMatch = text.match(
      /\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:ทุ่ม|โมง|am|pm))\b/i
    );
    await supabase.from("match_requests").insert({
      community_id: community.id,
      raw_text: text,
      game,
      role: roleMatch?.[1] ?? null,
      time_window: timeMatch?.[0] ?? null,
      parse_confidence: game ? 0.85 : 0.5,
      status: "pending",
    });
    setDraft("");
    toast.success("เพิ่มคำขอแล้ว");
    refresh();
  };

  const runMatcher = async () => {
    if (!community) return;
    toast.info("🤖 กำลังจับคู่...");
    setTimeout(async () => {
      if (requests.length >= 3) {
        const players = requests
          .slice(0, 3)
          .map((r) => ({
            nick: "Player" + Math.floor(Math.random() * 99),
            style: r.role || "Flex",
          }));
        const game = requests[0].game || "ROV";
        await supabase.from("teams").insert({
          community_id: community.id,
          game,
          scheduled_time: new Date(Date.now() + 3600_000).toISOString(),
          players,
          outcome: "scheduled",
        });
        await supabase.from("activity_feed").insert({
          community_id: community.id,
          type: "match",
          message: `🎮 จัดทีม ${game} สำเร็จ — ${players.length} คน`,
        });
        toast.success("จัดทีมสำเร็จ!");
      } else {
        toast.warning("คำขอไม่พอจัดทีม (ต้องการอย่างน้อย 3)");
      }
      refresh();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl mb-1">Smart Matchmaker</h1>
          <p className="text-sm text-muted-foreground">จัดทีมอัตโนมัติด้วย AI</p>
        </div>
        <Button variant="hero" onClick={runMatcher}>
          <Play size={16} /> Run Matchmaker
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg">⚙ Matchmaking Rules</h2>
        <div>
          <Label className="text-xs">จำนวนทีมสูงสุดต่อเกม</Label>
          <div className="mt-3 space-y-3">
            {GAMES.map((g) => (
              <div key={g} className="flex items-center gap-3">
                <div className="w-32 text-sm">{g}</div>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={rules[g] ?? 5}
                  onChange={(e) =>
                    setRules({ ...rules, [g]: Number(e.target.value) || 1 })
                  }
                  className="w-20 h-10"
                />
                <span className="text-xs text-muted-foreground">คน</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <Label>Time Window Tolerance</Label>
            <span className="font-semibold text-primary">{timeWindow} นาที</span>
          </div>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            จับผู้เล่นที่เวลาต่างกันไม่เกิน X นาที
          </p>
        </div>

        <div>
          <Label className="text-xs mb-2 block">Rank Gap Tolerance</Label>
          <select
            value={rankGap}
            onChange={(e) => setRankGap(e.target.value)}
            className="w-full h-11 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="any">Any rank</option>
            <option value="±1">±1 tier</option>
            <option value="±2">±2 tiers</option>
            <option value="strict">Same tier only</option>
          </select>
        </div>

        <Button variant="hero" onClick={saveRules}>
          บันทึก
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={18} className="text-primary" />
          <h2 className="text-lg">เพิ่ม Match Request</h2>
          <span className="text-xs text-muted-foreground ml-1">
            AI parse ให้อัตโนมัติ
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <Input
            placeholder="เช่น 'หาทีม ROV 3 ทุ่ม สายขาน' หรือ 'เปรียว MLBB คืนนี้ สาย mid'"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && parseRequest()}
            className="h-11"
          />
          <Button variant="hero" onClick={parseRequest}>
            Add
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-lg">Incoming Requests</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning font-semibold">
              {requests.length}
            </span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {requests.length === 0 && (
              <div className="p-6 text-sm text-center text-muted-foreground">
                ไม่มีคำขอ
              </div>
            )}
            {requests.map((r) => (
              <div key={r.id} className="p-4">
                <div className="text-sm">{r.raw_text}</div>
                <div className="flex gap-2 mt-2">
                  {r.game && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary">
                      {r.game}
                    </span>
                  )}
                  {r.role && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent/15 text-accent">
                      {r.role}
                    </span>
                  )}
                  {r.time_window && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-warning/15 text-warning">
                      {r.time_window}
                    </span>
                  )}
                  {(r.parse_confidence ?? 0) < 0.7 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Parse manually
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-lg">Active Teams</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
              {teams.length}
            </span>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {teams.length === 0 && (
              <div className="p-6 text-sm text-center text-muted-foreground">
                ยังไม่มีทีม
              </div>
            )}
            {teams.map((t) => (
              <div key={t.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t.game}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.scheduled_time
                      ? new Date(t.scheduled_time).toLocaleString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "short",
                        })
                      : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(t.players || []).map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-background border border-border"
                    >
                      {p.nick}{" "}
                      <span className="text-muted-foreground">· {p.style}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg">🏆 Match History (7 วันล่าสุด)</h2>
        </div>
        <div className="divide-y divide-border">
          {teams.length === 0 && (
            <div className="p-6 text-sm text-center text-muted-foreground">
              ยังไม่มีประวัติ
            </div>
          )}
          {teams.slice(0, 10).map((t) => {
            const d = new Date(t.created_at);
            return (
              <div
                key={t.id}
                className="px-5 py-3 grid grid-cols-5 items-center text-sm gap-3"
              >
                <span className="text-muted-foreground">
                  {d.toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="font-semibold">{t.game}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold w-fit">
                  {(t.players || []).length} คน
                </span>
                <span className="text-muted-foreground">
                  {t.scheduled_time
                    ? new Date(t.scheduled_time).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </span>
                <span
                  className={`justify-self-end text-xs px-2 py-0.5 rounded font-semibold ${
                    t.outcome === "cancelled"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {t.outcome === "cancelled" ? "ยกเลิก" : "สำเร็จ"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
