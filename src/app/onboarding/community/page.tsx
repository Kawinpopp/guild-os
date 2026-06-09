"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCommunity } from "@/lib/use-community";
import type { Platform } from "@/interface";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Check, Copy, ChevronRight } from "lucide-react";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night", "Late Night"];
const GAMES = ["ROV", "Valorant", "PUBG", "League of Legends", "Dota 2", "Genshin Impact", "Other"];
const ROLES = ["Tank", "Support", "Carry", "Mid", "Jungle", "Flex", "Other"];
const PLAY_STYLES = ["Aggressive", "Teamwork", "Competitive", "Casual"];
const GOALS = [
  { value: "rank_push", label: "Push Rank" },
  { value: "casual", label: "Casual Play" },
  { value: "tournament", label: "Tournament" },
  { value: "find_team", label: "Find Team" },
];

export default function OnboardCommunity() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { data: existing, isLoading } = useCommunity();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<{
    name: string;
    platform: Platform | "";
    total_members: number | "";
  }>({ name: "", platform: "", total_members: "" });
  const [profile, setProfile] = useState<{
    game: string;
    role: string;
    available_time: string[];
    play_style: string;
    goal: string;
    rank: string;
  }>({ game: "", role: "", available_time: [], play_style: "", goal: "", rank: "" });
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [webhook, setWebhook] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!isLoading && existing?.is_onboarded) router.replace("/dashboard");
  }, [existing, isLoading, router]);

  const saveStep1 = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.platform || !user) return;
    setBusy(true);

    if (communityId) {
      setBusy(false);
      setStep(2);
      return;
    }

    const payload: TablesInsert<"communities"> = {
      admin_auth_id: user.id,
      name: form.name,
      platform: form.platform,
      platform_group_id: crypto.randomUUID(),
      total_members: form.total_members || 0,
    };

    const { data, error } = await supabase.from("communities").insert(payload).select().single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommunityId(data.id);
    setWebhook(`https://api.guildos.app/api/webhook/${data.platform}/${data.platform_group_id}`);
    setStep(2);
  };

  const saveStep2 = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!profile.game || !profile.role || !profile.play_style || !profile.goal) {
      toast.error("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!user || !communityId) return;
    setBusy(true);

    const res = await fetch("/api/ai/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: communityId,
        auth_user_id: user.id,
        platform: form.platform,
        ...profile,
      }),
    });

    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "บันทึก Profile ไม่สำเร็จ");
      return;
    }
    setStep(3);
  };

  const finish = async () => {
    if (!user || !communityId) return;
    setBusy(true);
    const { error } = await supabase
      .from("communities")
      .update({ is_onboarded: true })
      .eq("id", communityId);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["community", user.id] });
    setBusy(false);
    toast.success("เริ่มต้นใช้งาน GuildOS!");
    router.replace("/dashboard");
  };

  const toggleTime = (slot: string) => {
    setProfile((prev) => ({
      ...prev,
      available_time: prev.available_time.includes(slot)
        ? prev.available_time.filter((t) => t !== slot)
        : [...prev.available_time, slot],
    }));
  };

  const TOTAL_STEPS = 4;

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative max-w-2xl mx-auto px-5 py-12">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm transition ${
                  step >= n
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {step > n ? <Check size={16} /> : n}
              </div>
              {n < TOTAL_STEPS && (
                <div className={`w-12 h-0.5 ${step > n ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          {/* Step 1 — Community Info */}
          {step === 1 && (
            <form onSubmit={saveStep1} className="space-y-5">
              <h2 className="text-2xl">ข้อมูลกลุ่มของคุณ</h2>
              <p className="text-sm text-muted-foreground">บอกเราเกี่ยวกับชุมชนเกมของคุณ</p>
              <div className="space-y-2">
                <Label>ชื่อกลุ่ม *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11"
                  placeholder="เช่น Thailand ROV Pro Squad"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>แพลตฟอร์ม *</Label>
                  <Select
                    value={form.platform}
                    onValueChange={(v) => setForm({ ...form, platform: v as Platform })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="discord">Discord</SelectItem>
                      <SelectItem value="line">LINE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>จำนวนสมาชิกประมาณ</Label>
                  <Input
                    type="number"
                    value={form.total_members}
                    onChange={(e) => setForm({ ...form, total_members: +e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={busy || !form.platform}
                className="w-full"
              >
                ถัดไป <ChevronRight size={18} />
              </Button>
            </form>
          )}

          {/* Step 2 — Gaming Profile */}
          {step === 2 && (
            <form onSubmit={saveStep2} className="space-y-5">
              <h2 className="text-2xl">โปรไฟล์เกมของคุณ</h2>
              <p className="text-sm text-muted-foreground">
                ข้อมูลนี้ช่วย AI จับคู่เพื่อนร่วมทีมได้แม่นยำขึ้น
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เกมที่เล่น *</Label>
                  <Select
                    value={profile.game}
                    onValueChange={(v) => setProfile({ ...profile, game: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือกเกม" />
                    </SelectTrigger>
                    <SelectContent>
                      {GAMES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={profile.role}
                    onValueChange={(v) => setProfile({ ...profile, role: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือก Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>เวลาที่ว่าง (เลือกได้หลายช่วง)</Label>
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleTime(slot)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        profile.available_time.includes(slot)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>สไตล์การเล่น *</Label>
                  <Select
                    value={profile.play_style}
                    onValueChange={(v) => setProfile({ ...profile, play_style: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAY_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>เป้าหมาย *</Label>
                  <Select
                    value={profile.goal}
                    onValueChange={(v) => setProfile({ ...profile, goal: v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="เลือก" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOALS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rank (ไม่บังคับ)</Label>
                <Input
                  value={profile.rank}
                  onChange={(e) => setProfile({ ...profile, rank: e.target.value })}
                  className="h-11"
                  placeholder="เช่น Diamond, Platinum, Gold"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ย้อนกลับ
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  disabled={
                    busy || !profile.game || !profile.role || !profile.play_style || !profile.goal
                  }
                  className="flex-1"
                >
                  {busy ? "กำลังบันทึก..." : "ถัดไป"} <ChevronRight size={18} />
                </Button>
              </div>
            </form>
          )}

          {/* Step 3 — Webhook */}
          {step === 3 && webhook && (
            <div className="space-y-5">
              <h2 className="text-2xl">เชื่อมต่อ Webhook</h2>
              <p className="text-sm text-muted-foreground">
                คัดลอก URL ด้านล่างไปตั้งค่าในแพลตฟอร์มของคุณ (ทำภายหลังก็ได้)
              </p>
              <div className="rounded-lg border border-border bg-background p-4 flex items-center gap-3">
                <code className="text-xs flex-1 truncate text-accent">{webhook}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(webhook);
                    toast.success("คัดลอกแล้ว");
                  }}
                >
                  <Copy size={14} /> Copy
                </Button>
              </div>
              <div className="rounded-lg bg-background/60 border border-border p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">วิธีตั้งค่าสำหรับ {form.platform}:</p>
                {form.platform === "discord" && (
                  <p>
                    1. ไปที่ Server Settings → Integrations → Webhooks → New Webhook
                    <br />
                    2. วาง URL ด้านบนใน Webhook URL
                  </p>
                )}
                {form.platform === "facebook" && (
                  <p>
                    1. ไปที่ Facebook Developer Console
                    <br />
                    2. ตั้งค่า Webhook สำหรับ Group และวาง URL ด้านบน
                  </p>
                )}
                {form.platform === "line" && (
                  <p>
                    1. ไปที่ LINE Developers Console
                    <br />
                    2. สร้าง Messaging API channel และวาง URL ใน Webhook
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  ย้อนกลับ
                </Button>
                <Button variant="hero" onClick={() => setStep(4)} className="flex-1">
                  ถัดไป <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
                <Check className="text-accent" size={32} />
              </div>
              <h2 className="text-2xl">พร้อมใช้งาน!</h2>
              <p className="text-sm text-muted-foreground">
                เราได้สร้างชุมชน <span className="text-foreground font-semibold">{form.name}</span>{" "}
                ของคุณเรียบร้อยแล้ว — เราเตรียม demo data ไว้ให้ทดลองใช้
              </p>
              <Button variant="hero" size="lg" onClick={finish} disabled={busy} className="w-full">
                {busy ? "กำลังเตรียม..." : "🚀 เข้าสู่ Dashboard"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
