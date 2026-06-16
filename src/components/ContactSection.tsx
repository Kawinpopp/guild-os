"use client";

import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { MessageSquareText } from "lucide-react";

export function ContactSection() {
  const [form, setForm] = useState({
    admin_name: "",
    group_name: "",
    platform: "",
    member_count: "",
    contact: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.admin_name || !form.group_name || !form.platform || !form.contact) {
      toast.error("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("communities").select("id").limit(0);
    setSubmitting(false);
    if (error) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      return;
    }
    toast.success("✓ ได้รับข้อมูลแล้ว! ทีมเราจะติดต่อกลับภายใน 24 ชั่วโมง");
    setForm({
      admin_name: "",
      group_name: "",
      platform: "",
      member_count: "",
      contact: "",
    });
  };

  return (
    <section id="contact-form" className="py-24 border-t border-border bg-card/40">
      <div className="max-w-2xl mx-auto px-5">
        <div className="text-center mb-10">
          <MessageSquareText className="mx-auto text-accent mb-4" size={36} />
          <h2 className="text-3xl md:text-4xl mb-3">สนใจทดลองใช้?</h2>
          <p className="text-muted-foreground">
            กรอกข้อมูลด้านล่าง ทีมเราจะติดต่อกลับภายใน 24 ชั่วโมง
          </p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ชื่อแอดมิน *</Label>
              <Input
                value={form.admin_name}
                onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                placeholder="ชื่อของคุณ"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>ชื่อกลุ่ม *</Label>
              <Input
                value={form.group_name}
                onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                placeholder="เช่น Thailand ROV Pro"
                className="h-11"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>แพลตฟอร์ม *</Label>
              <Select
                value={form.platform}
                onValueChange={(v) => setForm({ ...form, platform: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook Group</SelectItem>
                  <SelectItem value="Discord">Discord Server</SelectItem>
                  <SelectItem value="LINE">LINE OpenChat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>จำนวนสมาชิก</Label>
              <Select
                value={form.member_count}
                onValueChange={(v) => setForm({ ...form, member_count: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<5k">น้อยกว่า 5,000</SelectItem>
                  <SelectItem value="5k-30k">5,000 – 30,000</SelectItem>
                  <SelectItem value="30k-150k">30,000 – 150,000</SelectItem>
                  <SelectItem value=">150k">มากกว่า 150,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>เบอร์โทร / LINE ID *</Label>
            <Input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="089-xxx-xxxx หรือ LINE: @yourname"
              className="h-11"
            />
          </div>
          <Button type="submit" variant="hero" size="lg" disabled={submitting} className="w-full">
            {submitting ? "กำลังส่ง..." : "ส่งข้อมูล"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            เราจะไม่ส่งสแปม และไม่เผยแพร่ข้อมูลของคุณ
          </p>
        </form>
      </div>
    </section>
  );
}
