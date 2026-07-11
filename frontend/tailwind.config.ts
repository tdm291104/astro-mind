import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        void:        "#060a14",
        deep:        "#0c1220",
        panel:       "#0f1729",
        card:        "#0d1526",
        cardhover:   "#111d35",
        // Gold accent family
        cyan:        "#c9a55c",
        teal:        "#b8944e",
        violet:      "#a67c42",
        amber:       "#f59e0b",
        danger:      "#f43f5e",
        ok:          "#22c55e",
        // Text
        ink:         "#ede8df",
        "ink-soft":  "#8892a8",
        "ink-muted": "#4a5568",
        // Borders
        line:        "rgba(255,255,255,0.08)",
        "line-bright":"rgba(255,255,255,0.15)",
        // Legacy aliases
        navy:        "#060a14",
        "surface-deep": "#0c1220",
        ivory:       "#ede8df",
        nebula:      "#a67c42",
        aurora:      "#c9a55c",
        starlight:   "#c9a55c",
        hairline:    "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        logo: ["var(--font-syne)", "system-ui", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      lineHeight: {
        relaxed: "1.7",
      },
      boxShadow: {
        glow:         "0 0 20px rgba(201,165,92,0.25)",
        "glow-violet":"0 0 24px rgba(201,165,92,0.35)",
        "glow-amber": "0 0 18px rgba(201,165,92,0.30)",
        lift:         "0 12px 30px -8px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-scale": {
          "0%": { opacity: "0", transform: "scale(0.98)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulsar: {
          "0%": { transform: "scale(0.35)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out both",
        "fade-scale": "fade-scale 0.2s ease-out both",
        pulsar: "pulsar 1.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
