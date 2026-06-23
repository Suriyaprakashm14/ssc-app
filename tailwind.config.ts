import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#080b12", panel: "#111827", brand: "#75e6b2", muted: "#94a3b8" }, boxShadow: { glow: "0 12px 48px rgba(117,230,178,.14)" } } },
  plugins: [],
} satisfies Config;
