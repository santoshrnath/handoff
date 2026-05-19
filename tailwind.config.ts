import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060f",
          900: "#0a0c1c",
          800: "#0f1228",
          700: "#161a36",
          600: "#1f2447",
        },
        violet: {
          glow: "#8b5cf6",
          deep: "#6d28d9",
        },
        cyan: {
          glow: "#22d3ee",
        },
        emerald: {
          glow: "#34d399",
        },
        rose: {
          glow: "#f43f5e",
        },
        amber: {
          glow: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "executive-gradient":
          "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(139,92,246,0.25), transparent), radial-gradient(ellipse 60% 60% at 80% 50%, rgba(34,211,238,0.12), transparent), radial-gradient(ellipse 60% 60% at 20% 80%, rgba(52,211,153,0.10), transparent)",
        "card-glow":
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(139,92,246,0.45)",
        "glow-cyan": "0 0 40px -10px rgba(34,211,238,0.45)",
        "glow-emerald": "0 0 40px -10px rgba(52,211,153,0.45)",
        "glow-rose": "0 0 40px -10px rgba(244,63,94,0.45)",
        "card-lift":
          "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 60px -20px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
