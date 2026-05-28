"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCommunity } from "@/lib/use-community";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type M = {
  id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  users: {
    id: string;
    display_name: string;
    platform_type: string;
    warning_count: number;
    status: string;
    last_active_at: string | null;
  } | null;
};

export default function Members() {
  const { data: community } = useCommunity();
  const [members, setMembers] = useState<M[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("__all__");
  const [selected, setSelected] = useState<M | null>(null);

  useEffect(() => {
    if (!community) return;
    supabase
      .from("community_members")
      .select(
        "id, role, joined_at, is_active, users(id, display_name, platform_type, warning_count, status, last_active_at)",
      )
      .eq("community_id", community.id)
      .eq("is_active", true)
      .order("joined_at", { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }) => setMembers((data ?? []) as any));
  }, [community]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => set.add(m.role));
    return Array.from(set).sort();
  }, [members]);

  const filtered = members.filter((m) => {
    const name = m.users?.display_name ?? "";
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "__all__" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  const statusColor = (status: string) =>
    status === "banned"
      ? "bg-destructive/15 text-destructive"
      : status === "muted" || status === "warned"
        ? "bg-warning/15 text-warning"
        : "bg-accent/15 text-accent";

  const warnColor = (count: number) =>
    count >= 3 ? "text-destructive" : count >= 1 ? "text-warning" : "text-accent";

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl mb-1">Members</h1>
        <p className="text-sm text-muted-foreground">
          สมาชิกทั้งหมดในชุมชน พร้อมสถานะและข้อมูลจากแพลตฟอร์ม
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="🔍 Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[260px] h-11"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-11 rounded-md border border-border bg-card px-3 text-sm min-w-[160px]"
        >
          <option value="__all__">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
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
          {filtered.map((m) => {
            const user = m.users;
            const name = user?.display_name ?? "—";
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-lg">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold capitalize ${statusColor(user?.status ?? "active")}`}
                  >
                    {user?.status ?? "active"}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">
                    {user?.platform_type ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground uppercase tracking-wide">Warnings</span>
                  <span className={`font-bold ${warnColor(user?.warning_count ?? 0)}`}>
                    {user?.warning_count ?? 0}
                  </span>
                </div>
              </button>
            );
          })}
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
                {(selected.users?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="text-lg font-semibold">{selected.users?.display_name ?? "—"}</div>
              <div className="text-sm text-muted-foreground capitalize">{selected.role}</div>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Platform" value={selected.users?.platform_type ?? "—"} />
              <Row label="Role" value={selected.role} className="capitalize" />
              <Row
                label="Joined"
                value={new Date(selected.joined_at).toLocaleDateString("th-TH")}
              />
              <Row
                label="Last active"
                value={
                  selected.users?.last_active_at
                    ? new Date(selected.users.last_active_at).toLocaleString("th-TH")
                    : "—"
                }
              />
              <Row label="Status" value={selected.users?.status ?? "—"} className="capitalize" />
            </div>

            <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Warning Count
              </div>
              <div
                className={`text-4xl font-display font-bold mb-1 ${warnColor(selected.users?.warning_count ?? 0)}`}
              >
                {selected.users?.warning_count ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {(selected.users?.warning_count ?? 0) === 0
                  ? "No violations"
                  : (selected.users?.warning_count ?? 0) >= 3
                    ? "At risk of ban"
                    : "Has prior warnings"}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                Status Flags
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded font-semibold capitalize ${statusColor(selected.users?.status ?? "active")}`}
                >
                  {selected.users?.status ?? "active"}
                </span>
                {(selected.users?.warning_count ?? 0) === 0 && (
                  <span className="text-xs px-2.5 py-1 rounded bg-accent/15 text-accent font-semibold">
                    Clean Record
                  </span>
                )}
                {(selected.users?.warning_count ?? 0) >= 3 && (
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
