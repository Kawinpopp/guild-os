"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu, X } from "lucide-react";

export function LandingNavBar() {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${scrolled ? "backdrop-blur-xl bg-background/70 border-b border-border" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground transition">
            Pricing
          </a>
          <a href="#contact-form" className="hover:text-foreground transition">
            Contact
          </a>
          <Link href="/login" className="hover:text-foreground transition">
            เข้าสู่ระบบ
          </Link>
        </nav>
        <div className="hidden md:block">
          <a href="#contact-form">
            <Button variant="hero" size="sm">
              ทดลองใช้ฟรี
            </Button>
          </a>
        </div>
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="menu"
        >
          {navOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {navOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-5 py-4 flex flex-col gap-4 text-sm">
            <a href="#features" onClick={() => setNavOpen(false)}>
              Features
            </a>
            <a href="#pricing" onClick={() => setNavOpen(false)}>
              Pricing
            </a>
            <a href="#contact-form" onClick={() => setNavOpen(false)}>
              Contact
            </a>
            <Link href="/login" onClick={() => setNavOpen(false)}>
              เข้าสู่ระบบ
            </Link>
            <a href="#contact-form" onClick={() => setNavOpen(false)}>
              <Button variant="hero" size="sm" className="w-full">
                ทดลองใช้ฟรี
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
