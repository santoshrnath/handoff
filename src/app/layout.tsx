import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "ContextBridge — Survive the handoff",
  description:
    "The tacit knowledge that dies in transitions, made survivable. AI-interrogated handoff packages with a trust layer, receiver Q&A, and drift detection over time.",
  metadataBase: new URL(
    process.env.PUBLIC_URL ?? "https://handover.oneplaceplatform.com",
  ),
  openGraph: {
    title: "ContextBridge",
    description:
      "The moments work changes hands. Captured, transferable, trustworthy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#0a0c1c",
          colorInputBackground: "#0f1228",
          colorInputText: "#ffffff",
          colorText: "#e2e8f0",
          colorTextSecondary: "#94a3b8",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "shadow-glow",
          formButtonPrimary:
            "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400",
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="min-h-screen bg-ink-950 text-slate-100 antialiased selection:bg-violet-glow/40">
          <div className="fixed inset-0 -z-10 bg-executive-gradient" />
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
