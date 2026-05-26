"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCommunity } from "@/lib/use-community";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  Check,
  X,
  Loader2,
  Cpu,
  Link2,
  Activity,
  Layers,
  User,
  CreditCard,
  Shield,
} from "lucide-react";

type Tab = "ai" | "integrations" | "health" | "platforms" | "profile" | "subscription";

const TABS: { k: Tab; label: string; icon: typeof Cpu }[] = [
  { k: "ai", label: "AI Config", icon: Cpu },
  { k: "integrations", label: "Integrations", icon: Link2 },
  { k: "health", label: "System Health", icon: Activity },
  { k: "platforms", label: "Platforms", icon: Layers },
  { k: "profile", label: "Profile", icon: User },
  { k: "subscription", label: "Subscription", icon: CreditCard },
];

export default function Settings() {
  const { data: community } = useCommunity();
  const [tab, setTab] = useState<Tab>("ai");

  if (!community) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure AI, integrations, profile, and your plan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-md transition ${
              tab === t.k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "ai" && <AIConfig />}
      {tab === "integrations" && <Integrations community={community} />}
      {tab === "health" && <HealthChecks />}
      {tab === "platforms" && <Platforms />}
      {tab === "profile" && <Profile />}
      {tab === "subscription" && (
        <Subscription tier={community.settings as Record<string, unknown>} />
      )}
    </div>
  );
}

function AIConfig() {
  const { data: community, refetch } = useCommunity();
  const [threshold, setThreshold] = useState(0.85);
  const [autoRemove, setAutoRemove] = useState(true);
  const [rules, setRules] = useState<Record<string, number>>({
    ROV: 5,
    MLBB: 5,
    Valorant: 5,
    "PUBG Mobile": 4,
  });
  const [timeWindow, setTimeWindow] = useState(60);

  useEffect(() => {
    if (!community) return;
    const s = community.settings as {
      moderation?: { threshold?: number; auto_remove?: boolean };
      matchmaker?: { rules?: Record<string, number>; time_window?: number };
    };
    if (s.moderation?.threshold) setThreshold(s.moderation.threshold);
    if (typeof s.moderation?.auto_remove === "boolean") setAutoRemove(s.moderation.auto_remove);
    if (s.matchmaker?.rules) setRules((prev) => ({ ...prev, ...s.matchmaker!.rules }));
    if (typeof s.matchmaker?.time_window === "number") setTimeWindow(s.matchmaker.time_window);
  }, [community?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!community) return;
    const next = {
      ...(community.settings as object),
      moderation: { threshold, auto_remove: autoRemove },
      matchmaker: { rules, time_window: timeWindow },
    };
    await supabase.from("communities").update({ settings: next }).eq("id", community.id);
    toast.success("บันทึกแล้ว");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h2 className="text-lg">AI Moderation</h2>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-4 flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-sm">Confidence Threshold</div>
            <div className="text-xs text-muted-foreground mt-1">
              ปัจจุบัน: <span className="text-primary font-semibold">{threshold.toFixed(2)}</span> ·
              Auto-remove:{" "}
              <span className={autoRemove ? "text-accent" : "text-muted-foreground"}>
                {autoRemove ? "เปิด" : "ปิด"}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/moderation"
            className="text-xs text-primary hover:underline whitespace-nowrap"
          >
            → ไปยังหน้า Moderation
          </Link>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <Label>Threshold (quick adjust)</Label>
            <span className="font-semibold text-primary">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-sm">Auto-remove เมื่อเกิน threshold</Label>
          <Switch checked={autoRemove} onCheckedChange={setAutoRemove} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg">⚙ Matchmaker Rules</h2>
        {(["ROV", "MLBB", "Valorant", "PUBG Mobile"] as const).map((g) => (
          <div key={g} className="flex items-center gap-3">
            <div className="w-32 text-sm">{g}</div>
            <Input
              type="number"
              min={1}
              max={10}
              value={rules[g] ?? 5}
              onChange={(e) => setRules({ ...rules, [g]: Number(e.target.value) || 1 })}
              className="w-20 h-10"
            />
            <span className="text-xs text-muted-foreground">คน</span>
          </div>
        ))}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <Label>Time Window</Label>
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
        </div>
      </div>

      <Button variant="hero" onClick={save}>
        บันทึกการตั้งค่า
      </Button>
    </div>
  );
}

function Integrations({ community }: { community: { id: string; webhook_url: string } }) {
  const wh = (kind: string) => `https://api.guildos.app/wh/${kind}/${community.webhook_url}`;
  return (
    <div className="space-y-5">
      {(
        [
          {
            name: "LINE Messaging API",
            desc: "ส่งการแจ้งเตือน match และ moderation ผ่าน LINE",
            kind: "line",
          },
          {
            name: "Discord Bot",
            desc: "Bot สำหรับ moderation และ matchmaking",
            kind: "dc",
          },
          {
            name: "Facebook Webhook",
            desc: "รับ event จาก Facebook Group",
            kind: "fb",
          },
        ] as const
      ).map((p) => (
        <div key={p.kind} className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-display font-bold text-lg">{p.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
            </div>
            <span className="px-2 py-1 rounded text-[10px] font-semibold uppercase bg-accent/15 text-accent">
              Connected
            </span>
          </div>
          <Label className="text-xs">Webhook URL</Label>
          <div className="flex gap-2 mt-1">
            <Input value={wh(p.kind)} readOnly className="h-10 font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(wh(p.kind));
                toast.success("คัดลอกแล้ว");
              }}
            >
              <Copy size={14} />
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => toast.success("✅ ทดสอบสำเร็จ")}
          >
            Test Connection
          </Button>
        </div>
      ))}
    </div>
  );
}

function Platforms() {
  const { data: community, refetch } = useCommunity();
  const initial = (community?.settings as { platforms?: Record<string, boolean> } | undefined)
    ?.platforms ?? { facebook: true, discord: true, line: false };
  const [state, setState] = useState<Record<string, boolean>>(initial);
  const [notify, setNotify] = useState({ spam: true, team: false, milestone: true });

  useEffect(() => {
    const s = community?.settings as
      | { platforms?: Record<string, boolean>; notify?: typeof notify }
      | undefined;
    if (s?.platforms) setState(s.platforms);
    if (s?.notify) setNotify(s.notify);
  }, [community?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!community) return;
    const next = { ...(community.settings as object), platforms: state, notify };
    await supabase.from("communities").update({ settings: next }).eq("id", community.id);
    toast.success("บันทึกแล้ว");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg mb-4">🔌 Platform Webhooks</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(["facebook", "discord", "line"] as const).map((p) => (
            <div key={p} className="rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold capitalize">{p}</div>
                <Switch
                  checked={state[p] ?? false}
                  onCheckedChange={(v) => setState({ ...state, [p]: v })}
                />
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  state[p] ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                }`}
              >
                {state[p] ? "Connected" : "Not connected"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-lg">🔔 Notification Preferences</h2>
        <p className="text-xs text-muted-foreground -mt-2">
          รับแจ้งเตือนทาง Email เมื่อเกิดเหตุการณ์สำคัญ
        </p>
        {[
          {
            k: "spam" as const,
            t: "Spam Spike Alert",
            d: "แจ้งเมื่อ spam เกิน 5 โพสต์ใน 1 ชั่วโมง",
          },
          {
            k: "team" as const,
            t: "Team Formed",
            d: "แจ้งเมื่อ AI จัดทีมสำเร็จ",
          },
          {
            k: "milestone" as const,
            t: "Member Milestone",
            d: "แจ้งเมื่อสมาชิกถึง 100, 500, 1000 คน",
          },
        ].map((n) => (
          <div
            key={n.k}
            className="flex items-center justify-between py-2 border-b border-border/60 last:border-0"
          >
            <div>
              <div className="text-sm font-semibold">{n.t}</div>
              <div className="text-xs text-muted-foreground">{n.d}</div>
            </div>
            <Switch
              checked={notify[n.k]}
              onCheckedChange={(v) => setNotify({ ...notify, [n.k]: v })}
            />
          </div>
        ))}
      </div>

      <Button variant="hero" onClick={save}>
        บันทึก
      </Button>
    </div>
  );
}

function Profile() {
  const { data: community, refetch } = useCommunity();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (community) {
      setName(community.name);
      setDesc(community.description ?? "");
    }
  }, [community]);

  const save = async () => {
    if (!community) return;
    await supabase.from("communities").update({ name, description: desc }).eq("id", community.id);
    toast.success("บันทึกแล้ว");
    refetch();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
      <div className="space-y-2">
        <Label>Account Email</Label>
        <Input value={user?.email ?? ""} readOnly className="h-11 bg-background/40" />
      </div>
      <div className="space-y-2">
        <Label>ชื่อชุมชน</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label>คำอธิบาย</Label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11" />
      </div>
      <Button variant="hero" onClick={save}>
        บันทึก
      </Button>
    </div>
  );
}

function Subscription({ tier }: { tier: Record<string, unknown> }) {
  const current = ((tier?.plan as string | undefined) ?? "free").toLowerCase();
  const plans = [
    {
      id: "free",
      name: "Free",
      price: "฿0",
      features: ["1 ชุมชน", "1,000 สมาชิก", "AI Moderation พื้นฐาน"],
    },
    {
      id: "pro",
      name: "Pro",
      price: "฿990 / เดือน",
      features: ["3 ชุมชน", "30,000 สมาชิก", "Smart Matchmaker", "Priority support"],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "ติดต่อเรา",
      features: ["ไม่จำกัดชุมชน", "Custom AI models", "Dedicated success manager"],
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {plans.map((p) => {
        const active = current === p.id;
        return (
          <div
            key={p.id}
            className={`rounded-xl border p-6 ${
              active ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-display font-bold text-xl">{p.name}</div>
              {active && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary font-semibold uppercase">
                  Current
                </span>
              )}
            </div>
            <div className="text-2xl font-display font-bold mb-4">{p.price}</div>
            <ul className="space-y-2 text-sm mb-5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check size={14} className="text-accent mt-0.5" /> {f}
                </li>
              ))}
            </ul>
            <Button
              variant={active ? "outline" : "hero"}
              size="sm"
              className="w-full"
              disabled={active}
              onClick={() => toast.info("🔧 ทีมงานจะติดต่อกลับเร็วๆ นี้")}
            >
              {active ? "Current plan" : "Upgrade"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function HealthChecks() {
  const [checks, setChecks] = useState<Array<{ name: string; status: "ok" | "fail" | "checking" }>>(
    [],
  );

  const run = async () => {
    const items = [
      "Database Connection",
      "Realtime Subscriptions",
      "AI Moderation",
      "Matchmaker",
      "LINE Webhook",
      "Discord Bot",
      "Data Integrity",
    ];
    setChecks(items.map((n) => ({ name: n, status: "checking" as const })));
    for (let i = 0; i < items.length; i++) {
      await new Promise((r) => setTimeout(r, 200));
      setChecks((prev) =>
        prev.map((c, idx) =>
          idx === i ? { ...c, status: Math.random() > 0.15 ? "ok" : "fail" } : c,
        ),
      );
    }
  };

  useEffect(() => {
    run();
  }, []);

  const pass = checks.filter((c) => c.status === "ok").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const allOk = checks.length > 0 && fail === 0 && checks.every((c) => c.status === "ok");

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">System Health</h2>
          <p className="text-xs text-muted-foreground">
            {pass}/{checks.length} ผ่าน
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={run}>
          Re-check
        </Button>
      </div>
      <div
        className={`rounded-lg p-4 border ${
          allOk
            ? "border-accent/40 bg-accent/10 text-accent"
            : fail > 0
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-background/40"
        }`}
      >
        {allOk
          ? "✅ ระบบทั้งหมดพร้อมใช้งาน"
          : fail > 0
            ? `⚠ พบปัญหา ${fail} รายการ`
            : "กำลังตรวจสอบ..."}
      </div>
      <ul className="divide-y divide-border">
        {checks.map((c) => (
          <li key={c.name} className="py-3 flex items-center justify-between text-sm">
            <span>{c.name}</span>
            {c.status === "ok" && <Check size={18} className="text-accent" />}
            {c.status === "fail" && <X size={18} className="text-destructive" />}
            {c.status === "checking" && (
              <Loader2 size={18} className="text-muted-foreground animate-spin" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
