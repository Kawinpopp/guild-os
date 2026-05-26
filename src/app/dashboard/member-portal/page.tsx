"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Trophy, Swords, Users } from "lucide-react";

type Team = {
  id: string;
  game: string;
  scheduled_time: string | null;
  players: { nick: string; style: string }[];
  outcome: string | null;
  created_at: string;
};

type TopMember = {
  nickname: string;
  engagement_score: number;
  persona_tag: string | null;
  role: string;
};

export default function MemberPortal() {
  const { data: community } = useCommunity();
  const [teams, setTeams] = useState<Team[]>([]);
  const [top, setTop] = useState<TopMember[]>([]);
  const [draft, setDraft] = useState("");

  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portal/${community?.webhook_url ?? ""}`
      : "";

  useEffect(() => {
    if (!community) return;
    const id = community.id;
    Promise.all([
      supabase
        .from("teams")
        .select("*")
        .eq("community_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("members")
        .select("nickname, engagement_score, persona_tag, role")
        .eq("community_id", id)
        .order("engagement_score", { ascending: false })
        .limit(10),
    ]).then(([t, m]) => {
      setTeams((t.data ?? []) as unknown as Team[]);
      setTop((m.data ?? []) as TopMember[]);
    });
  }, [community]);

  const submitRequest = async () => {
    if (!community || !draft.trim()) return;
    const text = draft.trim();
    const GAMES = ["ROV", "MLBB", "Valorant", "PUBG Mobile", "LoL Wild Rift"];
    const game = GAMES.find((g) => text.toLowerCase().includes(g.toLowerCase())) ?? null;
    const roleMatch = text.match(/\b(mid|jungle|carry|support|tank|sup|adc|top)\b/i);
    const timeMatch = text.match(/\b(\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:ทุ่ม|โมง|am|pm))\b/i);
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
    toast.success("ส่งคำขอแล้ว — AI จะจับคู่ให้เร็วๆ นี้");
  };

  const tierOf = (s: number) =>
    s >= 85 ? "Diamond" : s >= 65 ? "Gold" : s >= 40 ? "Silver" : "Bronze";
  const tierColor = (s: number) =>
    s >= 85
      ? "bg-primary/15 text-primary"
      : s >= 65
        ? "bg-warning/15 text-warning"
        : s >= 40
          ? "bg-muted-foreground/15 text-muted-foreground"
          : "bg-destructive/15 text-destructive";

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl mb-1">Member Portal</h1>
        <p className="text-sm text-muted-foreground">
          ลิงก์สาธารณะสำหรับสมาชิกชุมชน — แชร์ให้สมาชิกสมัครและขอจับคู่เกมได้เลย
        </p>
      </div>

      {/* Shareable link */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink size={16} className="text-accent" />
          <h2 className="text-lg">ลิงก์ Portal สาธารณะ</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          แชร์ลิงก์นี้ให้สมาชิก — พวกเขาสามารถดูทีม, leaderboard และขอ match request
          ได้โดยไม่ต้องล็อกอิน
        </p>
        <div className="flex gap-2">
          <Input value={portalUrl} readOnly className="h-11 font-mono text-xs bg-background/40" />
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(portalUrl);
              toast.success("คัดลอกแล้ว");
            }}
          >
            <Copy size={14} /> Copy
          </Button>
          <Button variant="hero" onClick={() => window.open(portalUrl, "_blank")}>
            <ExternalLink size={14} /> เปิด
          </Button>
        </div>
      </div>

      {/* Quick match request */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-primary" />
          <h2 className="text-lg">ส่ง Match Request (ทดสอบ)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          ทดสอบส่งคำขอในฐานะสมาชิก — AI จะ parse เกม/role/เวลาให้อัตโนมัติ
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="เช่น 'หาทีม ROV 3 ทุ่ม สายขาน' หรือ 'MLBB mid tonight 9pm'"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRequest()}
            className="h-11"
          />
          <Button variant="hero" onClick={submitRequest} disabled={!draft.trim()}>
            ส่ง
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active teams */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Swords size={15} className="text-accent" />
            <h2 className="text-lg">ทีมล่าสุด</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
              {teams.length}
            </span>
          </div>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {teams.length === 0 && (
              <div className="p-8 text-sm text-center text-muted-foreground">ยังไม่มีทีม</div>
            )}
            {teams.map((t) => (
              <div key={t.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t.game}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      t.outcome === "cancelled"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    {t.outcome === "cancelled" ? "ยกเลิก" : "สำเร็จ"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(t.players ?? []).map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-background border border-border"
                    >
                      {p.nick}
                      <span className="text-muted-foreground"> · {p.style}</span>
                    </span>
                  ))}
                </div>
                {t.scheduled_time && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.scheduled_time).toLocaleString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Trophy size={15} className="text-warning" />
            <h2 className="text-lg">Leaderboard</h2>
            <span className="ml-auto text-xs text-muted-foreground">Top 10</span>
          </div>
          <ul className="divide-y divide-border">
            {top.length === 0 && (
              <li className="p-8 text-sm text-center text-muted-foreground">ยังไม่มีสมาชิก</li>
            )}
            {top.map((m, i) => (
              <li key={m.nickname} className="px-5 py-3 flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
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
                  <div className="text-sm font-semibold truncate">{m.nickname}</div>
                  <div className="text-[10px] text-muted-foreground">{m.persona_tag ?? m.role}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${tierColor(m.engagement_score)}`}
                  >
                    {tierOf(m.engagement_score)}
                  </span>
                  <span className="text-xs font-bold text-primary w-8 text-right">
                    {m.engagement_score}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Community stats */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-primary" />
          <h2 className="text-lg">ข้อมูลชุมชน</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-background/60 border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">ชื่อชุมชน</div>
            <div className="font-semibold">{community?.name ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-background/60 border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">แพลตฟอร์ม</div>
            <div className="font-semibold">{community?.platform ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-background/60 border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">จำนวนสมาชิก</div>
            <div className="font-semibold">{community?.member_count.toLocaleString() ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
