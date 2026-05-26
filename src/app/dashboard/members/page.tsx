"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type M = {
  id: string;
  nickname: string;
  persona_tag: string | null;
  role: string;
  engagement_score: number;
  platform_type: string | null;
  last_seen_at: string | null;
  joined_at: string;
};

export default function Members() {
  const { data: community } = useCommunity();
  const [members, setMembers] = useState<M[]>([]);
  const [search, setSearch] = useState("");
  const [persona, setPersona] = useState("__all__");
  const [selected, setSelected] = useState<M | null>(null);

  useEffect(() => {
    if (!community) return;
    supabase
      .from("members")
      .select("*")
      .eq("community_id", community.id)
      .order("engagement_score", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setMembers((data ?? []) as any));
  }, [community]);

  const personas = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.persona_tag) set.add(m.persona_tag);
    });
    return Array.from(set).sort();
  }, [members]);

  const filtered = members.filter((m) => {
    const matchSearch = m.nickname.toLowerCase().includes(search.toLowerCase());
    const matchPersona = persona === "__all__" || m.persona_tag === persona;
    return matchSearch && matchPersona;
  });

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
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Members</h1>
        <p className="text-sm text-muted-foreground">
          Synthetic personas built from real activity.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="🔍 Search nickname or game..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[260px] h-11"
        />
        <select
          value={persona}
          onChange={(e) => setPersona(e.target.value)}
          className="h-11 rounded-md border border-border bg-card px-3 text-sm min-w-[180px]"
        >
          <option value="__all__">All personas</option>
          {personas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground rounded-xl border border-border bg-card">
          ไม่พบสมาชิกที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-lg">
                  {m.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{m.nickname}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {m.persona_tag ?? m.role}
                  </div>
                </div>
              </div>
              {m.role && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold mb-3 capitalize">
                  {m.role}
                </span>
              )}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground uppercase tracking-wide">Engagement</span>
                  <span className="font-semibold text-accent">{m.engagement_score}</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${m.engagement_score}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-md h-full bg-card border-l border-border p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">Member Profile</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-muted rounded">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-3xl mb-3">
                {selected.nickname.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-lg font-semibold">{selected.nickname}</div>
              <div className="text-sm text-muted-foreground">
                {selected.persona_tag ?? "Member"}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Platform" value={selected.platform_type ?? "—"} />
              <Row label="Role" value={selected.role} className="capitalize" />
              <Row
                label="Joined"
                value={new Date(selected.joined_at).toLocaleDateString("th-TH")}
              />
              <Row
                label="Last seen"
                value={
                  selected.last_seen_at
                    ? new Date(selected.last_seen_at).toLocaleString("th-TH")
                    : "—"
                }
              />
            </div>

            <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Engagement Score
              </div>
              <div className="text-4xl font-display font-bold text-primary mb-3">
                {selected.engagement_score}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${selected.engagement_score}%` }}
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Persona
              </div>
              <div className="text-base font-semibold flex items-center justify-between">
                {selected.persona_tag ?? "Unclassified"}
                <span>🎮</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Behavior Flags
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded ${tierColor(selected.engagement_score)} font-semibold`}
                >
                  {tierOf(selected.engagement_score)} Tier
                </span>
                {selected.engagement_score >= 80 && (
                  <span className="text-xs px-2.5 py-1 rounded bg-warning/15 text-warning font-semibold">
                    High Activity
                  </span>
                )}
                {selected.engagement_score >= 70 && (
                  <span className="text-xs px-2.5 py-1 rounded bg-accent/15 text-accent font-semibold">
                    Top Engager
                  </span>
                )}
                {selected.engagement_score < 30 && (
                  <span className="text-xs px-2.5 py-1 rounded bg-destructive/15 text-destructive font-semibold">
                    At Risk
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${className ?? ""}`}>{value}</span>
    </div>
  );
}
