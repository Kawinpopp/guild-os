"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth, signOut as authSignOut } from "@/lib/auth-context";
import { useCommunity } from "@/lib/use-community";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Shield,
  Users,
  Swords,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Activity,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/dashboard/moderation", icon: Shield, label: "Moderation" },
  { to: "/dashboard/matchmaking", icon: Swords, label: "Matchmaking" },
  { to: "/dashboard/members", icon: Users, label: "Members" },
  { to: "/dashboard/insights", icon: BarChart3, label: "Insights" },
  { to: "/dashboard/member-portal", icon: Activity, label: "Member Portal" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const { user, loading } = useAuth();
  const { data: community } = useCommunity();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && community !== undefined && !community?.is_onboarded) {
      router.push("/onboarding/community");
    }
  }, [loading, user, community, router]);

  const onLogout = async () => {
    await authSignOut();
    router.push("/");
  };

  if (loading || !user || community === undefined || !community?.is_onboarded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        กำลังโหลด...
      </div>
    );
  }

  const Sidebar = (
    <aside className="w-[210px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Logo />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((n) => {
          const active = path === n.to || (n.to !== "/dashboard" && path.startsWith(n.to));
          return (
            <Link
              key={n.to}
              href={n.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <n.icon size={16} /> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-lg bg-sidebar-accent/40 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          <div className="text-sm font-semibold truncate">{community?.name}</div>
          <div className="text-[10px] text-muted-foreground">
            {community?.platform} · {community?.total_members.toLocaleString()} members
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{Sidebar}</div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-semibold truncate max-w-[200px]">{community?.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut size={14} /> ออกจากระบบ
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
