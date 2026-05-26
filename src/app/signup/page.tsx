"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (name === "" || email === "" || password === "" || confirmPassword === "") {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("สมัครสำเร็จ! กำลังเข้าสู่ระบบ...");
    router.push("/onboarding/community");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-grid px-5">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-8">
          <h1 className="text-2xl mb-1">สมัครสร้างบัญชีฟรี</h1>
          <p className="text-sm text-muted-foreground mb-6">
            เริ่มใช้ GuildOS — ไม่ต้องใช้บัตรเครดิต
          </p>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อแอดมิน</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Password (อย่างน้อย 6 ตัวอักษร)</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" size="lg" disabled={busy} className="w-full">
              {busy ? "กำลังสมัคร..." : "สร้างบัญชี"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
