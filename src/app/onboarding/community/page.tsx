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
    if (isLoading || !existing) return;
    router.replace("/dashboard");
  }, [existing, isLoading, router]);

  const saveStep1 = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.platform || !user) return;
    setBusy(true);

    if (communityId) {
      const { data: current } = await supabase
        .from("communities")
        .select("platform, platform_group_id")
        .eq("id", communityId)
        .single();

      if (current && current.platform !== form.platform) {
        await supabase
          .from("communities")
          .update({ platform: form.platform })
          .eq("id", communityId);
        setWebhook(
          `${window.location.origin}/api/webhook/${form.platform}/${current.platform_group_id}`,
        );
      }

      setBusy(false);
      setStep(2);
      return;
    }

    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: form.name,
        platform: form.platform,
        platform_group_id: crypto.randomUUID(),
        total_members: form.total_members || 0,
      } as never)
      .select()
      .single();
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.auth.updateUser({ data: { community_id: data.id } });
    setCommunityId(data.id);
    setWebhook(`${window.location.origin}/api/webhook/${data.platform}/${data.platform_group_id}`);
    setBusy(false);
    setStep(2);
  };

  const finish = async () => {
    if (!user || !communityId) return;
    setBusy(true);
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

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Callback URL
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
              </div>

              {form.platform === "facebook" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Verify Token
                  </p>
                  <div className="rounded-lg border border-border bg-background p-4 flex items-center gap-3">
                    <code className="text-xs flex-1 truncate text-accent">
                      {webhook.split("/").pop()}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(webhook.split("/").pop() ?? "");
                        toast.success("คัดลอกแล้ว");
                      }}
                    >
                      <Copy size={14} /> Copy
                    </Button>
                  </div>
                </div>
              )}

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
                    1. ไปที่ Facebook Developer Console → Your App → Webhooks
                    <br />
                    2. วาง <strong>Callback URL</strong> และ <strong>Verify Token</strong> ด้านบน
                    <br />
                    3. Subscribe to <code>feed</code> event ของ Group
                  </p>
                )}
                {form.platform === "line" && (
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>
                      ไปที่ <span className="text-foreground font-semibold">account.line.biz</span>{" "}
                      → สร้าง <strong>LINE Official Account</strong>
                    </li>
                    <li>
                      ใน LINE Official Account Manager → <strong>Settings</strong> →{" "}
                      <strong>Messaging API</strong> → กด <strong>Enable Messaging API</strong> →
                      เลือก Provider
                    </li>
                    <li>
                      ไปที่{" "}
                      <span className="text-foreground font-semibold">developers.line.biz</span> →
                      เลือก Channel ที่สร้าง → แท็บ <strong>Basic Settings</strong> → คัดลอก{" "}
                      <code className="bg-muted px-1 rounded text-xs">Channel Secret</code> → ใส่ใน{" "}
                      <code className="bg-muted px-1 rounded text-xs">.env</code> ชื่อ{" "}
                      <code className="bg-muted px-1 rounded text-xs">LINE_CHANNEL_SECRET</code>
                    </li>
                    <li>
                      แท็บ <strong>Messaging API</strong> → Webhook settings → วาง Callback URL
                      ด้านบน → เปิด <strong>Use webhook</strong> → กด <strong>Verify</strong>
                    </li>
                    <li>
                      ปิด <strong>Auto-reply messages</strong> และ{" "}
                      <strong>Greeting messages</strong>
                    </li>
                    <li>เพิ่ม Bot เข้ากลุ่ม LINE ของคุณ — ระบบจะเริ่มรับข้อความทันที</li>
                  </ol>
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
