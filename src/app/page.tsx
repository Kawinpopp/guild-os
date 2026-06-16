import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  Bot,
  Users,
  BarChart3,
  Shield,
  Sparkles,
  Webhook,
  Activity,
  Trophy,
  Check,
  ArrowRight,
} from "lucide-react";
import { LandingNavBar } from "@/components/LandingNavBar";
import { ContactSection } from "@/components/ContactSection";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNavBar />

      {/* HERO */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 bg-grid">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-5 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 text-xs text-muted-foreground mb-8">
            <Sparkles size={14} className="text-accent" />
            AI-powered Community Operating System
          </span>
          <h1
            className="font-display font-bold leading-[1.05] tracking-tight"
            style={{ fontSize: "clamp(40px, 7vw, 80px)" }}
          >
            Run your gaming guild
            <br />
            <span className="text-gradient-primary">on autopilot.</span>
          </h1>
          <p className="mt-7 max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed">
            เปลี่ยนกลุ่ม Facebook และ Discord ของคุณให้เป็นชุมชนที่จัดการตัวเองได้ — AI Moderator,
            Smart Matchmaker และ Sponsor-ready Analytics ในแพลตฟอร์มเดียว
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#contact-form" className="w-full sm:w-auto">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                🚀 เริ่มต้นฟรี <ArrowRight size={18} />
              </Button>
            </a>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                ดู Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-3xl md:text-4xl mb-3">ปัญหาที่แอดมินทุกคนเจอ</h2>
          <p className="text-center text-muted-foreground mb-14">
            เสียเวลา เสียเงิน และสปอนเซอร์ไม่ถามหา
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                title: "เสียเวลา 2-4 ชม./วัน",
                desc: "ตอบแชท ลบสแปม จัดทีม ทำเองทุกอย่าง 24 ชั่วโมง",
              },
              {
                icon: Shield,
                title: "เนื้อหาเป็นพิษ + สแปม",
                desc: "ระบาดทุกวัน ลดไม่ถัก สมาชิกหนีไปกลุ่มอื่น",
              },
              {
                icon: BarChart3,
                title: "ไม่มีข้อมูลดึงสปอนเซอร์",
                desc: "ทำแค่นับจำนวนสมาชิก นำเสนอ audience ไม่ได้",
              },
            ].map((p, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card/60 p-7 hover:border-primary/40 transition"
              >
                <p.icon className="text-destructive mb-4" size={28} />
                <h3 className="text-xl mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-3xl md:text-5xl mb-3">
            3 AI Agents <span className="text-gradient-primary">ทำงานให้ทุก 24/7</span>
          </h2>
          <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
            ระบบ AI ออกแบบมาสำหรับชุมชนเกมไทยโดยเฉพาะ เข้าใจสแลง เข้าใจวัฒนธรรม
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "AI Moderation",
                tag: "95% accuracy",
                desc: "กรองสแปม เนื้อหาเป็นพิษ และ toxic ภาษาไทย ลบอัตโนมัติทันที",
                color: "primary",
              },
              {
                icon: Users,
                title: "Smart Matchmaker",
                tag: "ลด toxic 40%",
                desc: "อ่านความต้องการทีมภาษาไทย จับทีมที่สมดุลตามทักษะและสไตล์",
                color: "accent",
              },
              {
                icon: Sparkles,
                title: "Synthetic Personas",
                tag: "Sponsor-ready",
                desc: "สร้าง Skill Card ของสมาชิก แปลงเป็น audience intelligence ส่งสปอนเซอร์ได้ทันที",
                color: "primary",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card p-8 hover:border-primary/50 hover:shadow-[0_0_40px_oklch(0.65_0.22_290/0.15)] transition group"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-${f.color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition`}
                >
                  <f.icon
                    className={f.color === "accent" ? "text-accent" : "text-primary"}
                    size={24}
                  />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl">{f.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                    {f.tag}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-3xl md:text-5xl mb-16">เริ่มต้นใน 3 ขั้นตอน</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {[
              {
                n: "01",
                icon: Webhook,
                title: "เชื่อมต่อกลุ่ม",
                desc: "Facebook, Discord หรือ LINE ผ่าน Webhook ใช้เวลา 5 นาที",
              },
              {
                n: "02",
                icon: Bot,
                title: "AI เริ่มทำงาน",
                desc: "ระบบทำงานอัตโนมัติ 24 ชั่วโมง ไม่ต้องเข้ามาดูแล",
              },
              {
                n: "03",
                icon: Trophy,
                title: "ดูรายงานบน Dashboard",
                desc: "เห็นข้อมูลชุมชน insights และ sponsor reports พร้อมส่ง",
              },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-display font-bold text-gradient-primary mb-4">
                  {s.n}
                </div>
                <s.icon className="mx-auto text-accent mb-4" size={32} />
                <h3 className="text-xl mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { v: "95%", l: "ความแม่นยำ AI Moderator" },
            { v: "90%", l: "ลดงาน Admin" },
            { v: "40%", l: "ลด Toxic ในกลุ่ม" },
            { v: "24/7", l: "ระบบทำงานตลอดเวลา" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-display font-bold text-4xl md:text-6xl text-gradient-primary">
                {s.v}
              </div>
              <div className="mt-2 text-xs md:text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-center text-3xl md:text-5xl mb-3">เลือกแพ็กเกจที่เหมาะกับชุมชน</h2>
          <p className="text-center text-muted-foreground mb-14">
            ไม่มี setup fee เริ่มต้นใช้งานได้เลย ยกเลิกได้ทุกเมื่อ
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "490",
                size: "5k–30k",
                popular: false,
                features: [
                  "AI Moderation พื้นฐาน",
                  "Basic Matchmaker",
                  "Dashboard มาตรฐาน",
                  "Email support",
                ],
              },
              {
                name: "Pro",
                price: "1,490",
                size: "30k–150k",
                popular: true,
                features: [
                  "AI Moderation เต็มรูปแบบ",
                  "Smart Matchmaker เต็มระบบ",
                  "Sponsor Report (PDF)",
                  "Persona Insights",
                  "Priority support",
                ],
              },
              {
                name: "Enterprise",
                price: "2,990+",
                size: "150k+",
                popular: false,
                features: [
                  "Custom AI Training",
                  "White-label Dashboard",
                  "SLA + Dedicated CSM",
                  "API + Webhook ขั้นสูง",
                ],
              },
            ].map((p, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 flex flex-col ${p.popular ? "border-2 border-primary bg-card glow-primary" : "border border-border bg-card/60"}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-[oklch(0.55_0.24_305)] text-primary-foreground text-[10px] font-bold tracking-wider">
                    POPULAR
                  </span>
                )}
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-5xl font-display font-bold">฿{p.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{p.size} สมาชิก</div>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className="text-accent mt-0.5 shrink-0" />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact-form" className="block mt-auto pt-8">
                  <Button variant={p.popular ? "hero" : "outline"} className="w-full">
                    เลือกแพ็กเกจนี้
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <ContactSection />

      {/* FOOTER */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-3 gap-8">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Community Operating System สำหรับชุมชนเกมไทยยุคใหม่
            </p>
          </div>
          <div className="text-sm">
            <div className="font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#contact-form" className="hover:text-foreground">
                  Contact
                </a>
              </li>
              <li>
                <span className="text-muted-foreground/60">Privacy Policy</span>
              </li>
              <li>
                <span className="text-muted-foreground/60">Terms</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <span>© 2026 GuildOS. All rights reserved.</span>
          <span>Made for Thai gaming guilds 🎮</span>
        </div>
      </footer>
    </div>
  );
}
