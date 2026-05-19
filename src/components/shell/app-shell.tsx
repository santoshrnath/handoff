"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Folder,
  ArrowRightLeft,
  MessageSquare,
  Inbox,
  LayoutTemplate,
  BarChart3,
  Settings,
  Menu,
  X,
  Sparkles,
  Bell,
  Search,
} from "lucide-react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/contexts", label: "Contexts", icon: Folder },
  { href: "/handoffs", label: "Handoffs", icon: ArrowRightLeft },
  { href: "/interviews", label: "My Interviews", icon: MessageSquare },
  { href: "/incoming", label: "Incoming", icon: Inbox },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            ContextBridge
          </span>
        </Link>
        <button
          aria-label="menu"
          onClick={() => setMobileOpen((s) => !s)}
          className="rounded-lg border border-white/10 bg-white/[0.04] p-2"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/5 bg-ink-900/80 backdrop-blur-xl",
          "flex transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          href="/"
          className="hidden items-center gap-3 px-5 py-5 md:flex"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
            <span className="absolute inset-0 -z-10 animate-pulse-slow rounded-xl bg-violet-glow/40 blur-xl" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-white">
              ContextBridge
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              OnePlace · Handoff
            </span>
          </div>
        </Link>
        <div className="px-3 pb-3 pt-3 md:pt-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search contexts…"
              className="input pl-9 text-sm"
            />
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border border-violet-glow/30 bg-violet-glow/10 text-violet-100"
                    : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-3">
          <SignedIn>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8 ring-1 ring-violet-glow/30",
                  },
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">
                  Signed in
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  Manage account
                </div>
              </div>
            </div>
          </SignedIn>
          <SignedOut>
            <div className="space-y-2">
              <SignInButton mode="modal">
                <button className="btn-ghost w-full !py-2 text-xs">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn-primary w-full !py-2 text-xs">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </SignedOut>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <button
          aria-label="close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-ink-950/70 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main */}
      <main className="relative flex-1 pt-16 md:pl-64 md:pt-0">
        <div className="hidden items-center justify-end gap-3 border-b border-white/5 bg-ink-950/40 px-8 py-3 backdrop-blur-xl md:flex">
          <button className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-300 hover:bg-white/[0.06]">
            <Bell className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pb-24 pt-4 md:px-8 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
