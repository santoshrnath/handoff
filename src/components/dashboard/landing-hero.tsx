"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import {
  ArrowRightLeft,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  RadioTower,
  Inbox,
} from "lucide-react";

export function LandingHero() {
  return (
    <div className="space-y-16 pb-16">
      <section className="relative">
        <div className="absolute -inset-x-32 -top-32 h-96 rounded-full bg-violet-glow/20 blur-3xl" />
        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="pill-violet w-fit">
              <Sparkles className="h-3 w-3" />
              The moments work changes hands
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              Survive the{" "}
              <span className="text-gradient-violet">handoff.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-300 md:text-lg">
              ContextBridge captures the tacit knowledge that dies in
              transitions. An AI interrogator pulls out what you&apos;ve stopped
              noticing. A trust layer keeps the politically honest stuff safe
              until you transfer it. Receivers ask questions of the package
              months later — and get cited answers, not guesses.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <SignUpButton mode="modal">
                <button className="btn-primary text-sm">
                  Start your first context
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="btn-ghost text-sm">Sign in</button>
              </SignInButton>
            </div>
          </div>
          <div className="relative">
            <div className="card relative overflow-hidden p-0">
              <div className="border-b border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-glow" />
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="h-2 w-2 rounded-full bg-emerald-glow" />
                  <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    AI Interview · 24:15
                  </span>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <Bubble who="ai">
                  You said the client is &ldquo;very particular about
                  timelines&rdquo;. Can you walk me through the last time they
                  pushed back on a deadline? What was the real reason behind
                  it?
                </Bubble>
                <Bubble who="user">
                  Last month. They wanted the dashboard by the 15th, but kept
                  adding new requirements. The real reason: waiting for internal
                  stakeholder alignment. They didn&apos;t want to say that
                  upfront.
                </Bubble>
                <Bubble who="ai">
                  Got it. How should the incoming person handle this situation
                  differently?
                </Bubble>
                <div className="flex items-center gap-1 pt-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-violet-glow" />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-violet-glow"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-violet-glow"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={<MessageSquare />}
          title="The interrogator"
          body="Probes vagueness, circles back to what you glossed over, paces itself through warm-up, core, deep-dive and wrap-up."
        />
        <FeatureCard
          icon={<ShieldCheck />}
          title="Trust layer"
          body="Honest notes stay private until you explicitly transfer them. Per-receiver redaction. No retroactive access."
        />
        <FeatureCard
          icon={<Inbox />}
          title="Receiver Q&A"
          body="Six weeks in, ask &lsquo;why did we go with Vendor X?&rsquo;. Get a cited answer from the actual records, not a guess."
        />
        <FeatureCard
          icon={<ArrowRightLeft />}
          title="Stand-in mode"
          body="Out for two days? A 5-minute interview focused on the next 48 hours. Mobile-first. Voice-friendly."
        />
        <FeatureCard
          icon={<RadioTower />}
          title="Drift detection"
          body="Standing contexts notice when reality diverges from what was documented, and prompt you to update."
        />
        <FeatureCard
          icon={<Sparkles />}
          title="Synthesis from artifacts"
          body="Drop in emails, minutes, briefs. AI proposes the first cut — you correct and add the tacit layer."
        />
      </section>
    </div>
  );
}

function Bubble({
  who,
  children,
}: {
  who: "ai" | "user";
  children: React.ReactNode;
}) {
  if (who === "ai") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-violet-400 shadow-glow">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-md border border-violet-glow/20 bg-violet-glow/10 px-4 py-2.5 text-sm leading-relaxed text-violet-100">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm leading-relaxed text-slate-100">
        {children}
      </div>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold">
        You
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-200">
        {icon}
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-400">{body}</div>
    </div>
  );
}
