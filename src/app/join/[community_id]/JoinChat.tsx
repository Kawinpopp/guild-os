"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GAMES = ["ROV", "MLBB", "Valorant", "PUBG Mobile"];

const ROLES: Record<string, string[]> = {
  ROV: ["Support", "Carry", "Jungle", "Offlane", "Mid"],
  MLBB: ["Support", "Marksman", "Fighter", "Assassin", "Mage", "Tank"],
  Valorant: ["Duelist", "Controller", "Initiator", "Sentinel"],
  "PUBG Mobile": ["Entry Fragger", "Support", "Scout", "Sniper"],
};

const TIME_SLOTS = [
  { id: "morning", label: "🌅 เช้า 06-12" },
  { id: "afternoon", label: "☀️ บ่าย 12-18" },
  { id: "evening", label: "🌆 เย็น 18-22" },
  { id: "night", label: "🌙 ดึก 22-02" },
  { id: "weekend", label: "📅 Weekend" },
];

const PLAY_STYLES = [
  { id: "Aggressive", label: "⚔️ Aggressive" },
  { id: "Teamwork", label: "🤝 Teamwork" },
  { id: "Competitive", label: "🏆 Competitive" },
  { id: "Casual", label: "😊 Casual" },
];

const GOALS = [
  { id: "rank_push", label: "🚀 ขึ้นแรงค์" },
  { id: "casual", label: "😎 เล่นสบายๆ" },
  { id: "tournament", label: "🏅 Tournament" },
  { id: "find_team", label: "👥 หาทีม" },
];

type Step =
  | "ign"
  | "game"
  | "role"
  | "rank"
  | "time"
  | "style"
  | "goal"
  | "confirm"
  | "submitting"
  | "done";

interface Message {
  from: "bot" | "user";
  text: string;
}

interface SkillData {
  ign: string;
  game: string;
  role: string;
  rank: string;
  available_time: string[];
  play_style: string;
  goal: string;
}

function BotText({ text }: { text: string }) {
  const segments = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg === "\n") return <br key={i} />;
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return <strong key={i}>{seg.slice(2, -2)}</strong>;
        }
        return <span key={i}>{seg}</span>;
      })}
    </>
  );
}

export default function JoinChat({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
  platform: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>("ign");
  const [inputVal, setInputVal] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [skillData, setSkillData] = useState<Partial<SkillData>>({});
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      setMessages([
        {
          from: "bot",
          text: `สวัสดีครับ! 🎮 ยินดีต้อนรับสู่ **${communityName}**\n\nผม GuildOS Bot จะช่วยสร้าง Skill Card ให้คุณใน 2 นาที 🚀\n\nเริ่มด้วย — **ชื่อ IGN** หรือชื่อในเกมของคุณคืออะไรครับ?`,
        },
      ]);
    }, 300);
  }, [communityName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function push(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  function botSay(text: string, delay = 600) {
    setTimeout(() => push({ from: "bot", text }), delay);
  }

  function userSay(text: string) {
    push({ from: "user", text });
  }

  function handleIgnSubmit() {
    const val = inputVal.trim();
    if (!val) return;
    setInputVal("");
    userSay(val);
    setSkillData((d) => ({ ...d, ign: val }));
    botSay(`เยี่ยมเลยครับ **${val}**! 🎯\n\nคุณเล่น**เกม**อะไรหลักๆ ครับ?`);
    setStep("game");
  }

  function handleRankSubmit(skip?: boolean) {
    const val = skip ? "" : inputVal.trim();
    userSay(val || "ไม่ระบุแรงค์");
    setSkillData((d) => ({ ...d, rank: val }));
    setInputVal("");
    botSay("ได้เลยครับ! ⏰\n\nปกติคุณ**ว่างเล่นช่วงไหน**บ้างครับ? (เลือกได้หลายช่วง)");
    setStep("time");
  }

  function handleChoice(value: string, label: string) {
    userSay(label);

    if (step === "game") {
      setSkillData((d) => ({ ...d, game: value }));
      botSay(`${value} เลยครับ! 💪\n\nคุณเล่น **Role** ไหนเป็นหลักครับ?`);
      setStep("role");
    } else if (step === "role") {
      setSkillData((d) => ({ ...d, role: value }));
      botSay(
        `**${value}** ครับ! 🎖️\n\n**แรงค์ปัจจุบัน**ของคุณคืออะไรครับ?\n(ถ้าไม่มีกด Skip ได้เลย)`,
      );
      setStep("rank");
    } else if (step === "style") {
      setSkillData((d) => ({ ...d, play_style: value }));
      botSay(`${label} เลยครับ! 🎮\n\n**เป้าหมายหลัก**ของคุณในเกมคืออะไรครับ?`);
      setStep("goal");
    } else if (step === "goal") {
      const finalData = { ...skillData, goal: value } as SkillData;
      setSkillData(finalData);
      const summary = buildSummary(finalData);
      botSay(
        `เยี่ยมมากครับ! 🎉\n\n📋 **สรุป Skill Card ของคุณ:**\n${summary}\n\nยืนยันข้อมูลนี้ไหมครับ?`,
      );
      setStep("confirm");
    }
  }

  function buildSummary(d: SkillData): string {
    const times = (d.available_time ?? [])
      .map((t) => TIME_SLOTS.find((s) => s.id === t)?.label ?? t)
      .join(", ");
    const goalLabel = GOALS.find((g) => g.id === d.goal)?.label ?? d.goal;
    return [
      `• IGN: ${d.ign}`,
      `• เกม: ${d.game}`,
      `• Role: ${d.role}`,
      `• แรงค์: ${d.rank || "ไม่ระบุ"}`,
      `• เวลาว่าง: ${times}`,
      `• สไตล์: ${d.play_style}`,
      `• เป้าหมาย: ${goalLabel}`,
    ].join("\n");
  }

  function handleTimeConfirm() {
    if (selectedTimes.length === 0) return;
    const labels = selectedTimes.map((t) => TIME_SLOTS.find((s) => s.id === t)?.label ?? t);
    userSay(labels.join(", "));
    setSkillData((d) => ({ ...d, available_time: selectedTimes }));
    botSay("โอเคครับ! 🎯\n\n**สไตล์การเล่น**ของคุณเป็นแบบไหนครับ?");
    setStep("style");
  }

  async function handleConfirm() {
    userSay("ยืนยันครับ ✅");
    setSubmitting(true);
    setStep("submitting");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: communityId,
          display_name: skillData.ign,
          game: skillData.game,
          role: skillData.role,
          available_time: skillData.available_time,
          play_style: skillData.play_style,
          goal: skillData.goal,
          rank: skillData.rank || null,
        }),
      });
      if (!res.ok) throw new Error();
      botSay(
        `🎉 **สร้าง Skill Card สำเร็จแล้วครับ!**\n\nยินดีต้อนรับสู่ **${communityName}** ครับ **${skillData.ign}**!\n\n🤖 AI ของเราจะช่วยจับคู่หาเพื่อนร่วมทีมที่เหมาะกับคุณโดยอัตโนมัติ 🚀`,
      );
      setStep("done");
    } catch {
      botSay("❌ เกิดข้อผิดพลาดครับ กรุณาลองใหม่อีกครั้ง");
      setStep("confirm");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    userSay("แก้ไขใหม่ครับ");
    setSkillData({});
    setSelectedTimes([]);
    setInputVal("");
    botSay("ได้เลยครับ! เริ่มใหม่ตั้งแต่ต้นเลยนะครับ\n\n**ชื่อ IGN** ของคุณคืออะไรครับ?");
    setStep("ign");
  }

  const renderControls = () => {
    switch (step) {
      case "ign":
        return (
          <div className="flex gap-2">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIgnSubmit()}
              placeholder="ชื่อในเกมของคุณ..."
              className="h-11 text-sm"
              autoFocus
            />
            <Button onClick={handleIgnSubmit} className="h-11 px-4" disabled={!inputVal.trim()}>
              <Send size={15} />
            </Button>
          </div>
        );

      case "game":
        return (
          <div className="flex flex-wrap gap-2">
            {GAMES.map((g) => (
              <Button
                key={g}
                variant="outline"
                onClick={() => handleChoice(g, g)}
                className="h-9 text-sm"
              >
                {g}
              </Button>
            ))}
          </div>
        );

      case "role":
        return (
          <div className="flex flex-wrap gap-2">
            {(ROLES[skillData.game ?? ""] ?? []).map((r) => (
              <Button
                key={r}
                variant="outline"
                onClick={() => handleChoice(r, r)}
                className="h-9 text-sm"
              >
                {r}
              </Button>
            ))}
          </div>
        );

      case "rank":
        return (
          <div className="flex gap-2">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !inputVal.trim() ? handleRankSubmit(true) : handleRankSubmit()
              }
              placeholder="เช่น Diamond, Mythic, Radiant..."
              className="h-11 text-sm"
              autoFocus
            />
            <Button
              variant="outline"
              onClick={() => handleRankSubmit(true)}
              className="h-11 whitespace-nowrap"
            >
              Skip
            </Button>
            <Button
              onClick={() => handleRankSubmit()}
              className="h-11 px-4"
              disabled={!inputVal.trim()}
            >
              <Send size={15} />
            </Button>
          </div>
        );

      case "time":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((t) => {
                const selected = selectedTimes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setSelectedTimes((prev) =>
                        selected ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                      )
                    }
                    className={`h-9 px-3 rounded-md border text-sm transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent border-border text-foreground hover:bg-accent/20"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <Button
              onClick={handleTimeConfirm}
              disabled={selectedTimes.length === 0}
              className="w-full h-9"
            >
              <Check size={14} className="mr-2" />
              ยืนยัน {selectedTimes.length > 0 && `(${selectedTimes.length})`}
            </Button>
          </div>
        );

      case "style":
        return (
          <div className="flex flex-wrap gap-2">
            {PLAY_STYLES.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                onClick={() => handleChoice(s.id, s.label)}
                className="h-9 text-sm"
              >
                {s.label}
              </Button>
            ))}
          </div>
        );

      case "goal":
        return (
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Button
                key={g.id}
                variant="outline"
                onClick={() => handleChoice(g.id, g.label)}
                className="h-9 text-sm"
              >
                {g.label}
              </Button>
            ))}
          </div>
        );

      case "confirm":
        return (
          <div className="flex gap-2">
            <Button onClick={handleConfirm} className="flex-1 h-11" disabled={submitting}>
              <Check size={15} className="mr-2" /> ยืนยัน
            </Button>
            <Button variant="outline" onClick={handleRetry} className="flex-1 h-11">
              แก้ไขใหม่
            </Button>
          </div>
        );

      case "submitting":
        return (
          <div className="flex items-center justify-center h-11 text-sm text-muted-foreground animate-pulse">
            กำลังบันทึก Skill Card...
          </div>
        );

      case "done":
        return (
          <div className="flex items-center justify-center h-11 text-sm text-accent font-semibold">
            ✅ เสร็จสิ้น — ปิดหน้าต่างนี้ได้เลยครับ
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
          🎮
        </div>
        <div>
          <div className="font-semibold text-sm">GuildOS Bot</div>
          <div className="text-xs text-muted-foreground">{communityName}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.from === "bot" && (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.from === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border rounded-tl-sm"
              }`}
            >
              {msg.from === "bot" ? <BotText text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4 flex-shrink-0 bg-card">{renderControls()}</div>
    </div>
  );
}
