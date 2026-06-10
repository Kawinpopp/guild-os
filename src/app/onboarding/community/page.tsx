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

  const TOTAL_STEPS = 3;

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

          {/* Step 2 — Webhook */}
          {step === 2 && webhook && (
            <div className="space-y-5">
              <h2 className="text-2xl">เชื่อมต่อ Webhook</h2>
              <p className="text-sm text-muted-foreground">
                คัดลอก URL ด้านล่างไปใส่ในแพลตฟอร์มของคุณ (ขั้นตอนนี้ทำได้ภายหลัง)
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ย้อนกลับ
                </Button>
                <Button variant="hero" onClick={() => setStep(3)} className="flex-1">
                  ถัดไป <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
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
