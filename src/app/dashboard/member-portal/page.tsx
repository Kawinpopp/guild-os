"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Trophy, Swords, Users } from "lucide-react";

type MatchItem = {
  id: string;
  game: string;
  match_score: number;
  status: string;
  requested_at: string;
  requester: { display_name: string } | null;
  matched_user: { display_name: string } | null;
};

type TopMember = {
  role: string;
  joined_at: string;
  users: { display_name: string; platform_type: string; last_active_at: string | null } | null;
};

export default function MemberPortal() {
  const { data: community } = useCommunity();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [top, setTop] = useState<TopMember[]>([]);

  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/portal/${community?.platform_group_id ?? ""}`
      : "";

  useEffect(() => {
    if (!community) return;
    const id = community.id;
    Promise.all([
      supabase
        .from("matches")
        .select(`
          id, game, match_score, status, requested_at,
          requester:users!matches_requester_id_fkey(display_name),
          matched_user:users!matches_matched_user_id_fkey(display_name)
        `)
        .eq("community_id", id)
        .order("requested_at", { ascending: false })
        .limit(10),
      supabase
        .from("community_members")
        .select("role, joined_at, users(display_name, platform_type, last_active_at)")
        .eq("community_id", id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(10),
    ]).then(([m, cm]) => {
      setMatches((m.data ?? []) as unknown as MatchItem[]);
      setTop((cm.data ?? []) as unknown as TopMember[]);
    });
  }, [community]);

  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-warning/15 text-warning",
    accepted: "bg-accent/15 text-accent",
    rejected: "bg-destructive/15 text-destructive",
    expired: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl mb-1">Member Portal</h1>
        <p className="text-sm text-muted-foreground">
          ลิงก์สาธารณะสำหรับสมาชิกชุมชน — แชร์ให้สมาชิกดูทีมและ leaderboard ได้เลย
        </p>
      </div>

      {/* Shareable link */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink size={16} className="text-accent" />
          <h2 className="text-lg">ลิงก์ Portal สาธารณะ</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          แชร์ลิงก์นี้ให้สมาชิก — พวกเขาสามารถดูผลการจับคู่และ leaderboard ได้โดยไม่ต้องล็อกอิน
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent matches */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Swords size={15} className="text-accent" />
            <h2 className="text-lg">การจับคู่ล่าสุด</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
              {matches.length}
            </span>
          </div>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {matches.length === 0 && (
              <div className="p-8 text-sm text-center text-muted-foreground">ยังไม่มีการจับคู่</div>
            )}
            {matches.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{m.game}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${STATUS_COLOR[m.status] ?? ""}`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span>{m.requester?.display_name ?? "—"}</span>
                  <span className="text-xs">vs</span>
                  <span>{m.matched_user?.display_name ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.requested_at).toLocaleString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {(m.match_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard — longest-standing active members */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <Trophy size={15} className="text-warning" />
            <h2 className="text-lg">OG Members</h2>
            <span className="ml-auto text-xs text-muted-foreground">สมาชิกเก่าสุด 10 คน</span>
          </div>
          <ul className="divide-y divide-border">
            {top.length === 0 && (
              <li className="p-8 text-sm text-center text-muted-foreground">ยังไม่มีสมาชิก</li>
            )}
            {top.map((m, i) => {
              const name = m.users?.display_name ?? "—";
              return (
                <li key={i} className="px-5 py-3 flex items-center gap-3">
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
                    <div className="text-sm font-semibold truncate">{name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {m.role} · {m.users?.platform_type ?? "—"}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    joined {new Date(m.joined_at).toLocaleDateString("th-TH", { day: "2-digit", month: "short" })}
                  </div>
                </li>
              );
            })}
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
            <div className="font-semibold capitalize">{community?.platform ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-background/60 border border-border p-4">
            <div className="text-xs text-muted-foreground mb-1">จำนวนสมาชิก</div>
            <div className="font-semibold">{community?.total_members.toLocaleString() ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
