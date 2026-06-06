import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0E14",
        surface: "#131820",
        "surface-2": "#1E2530",
        "surface-3": "#27303D",
        border: "#2D3A48",
        "border-light": "#384A5C",
        primary: "#00E5FF",
        "primary-dark": "#0099CC",
        "primary-light": "#4DFFFF",
        success: "#00FF88",
        "success-dark": "#00CC6E",
        danger: "#FF4D4D",
        "danger-dark": "#DD0000",
        warning: "#FFD700",
        "warning-dark": "#FFB700",
        muted: "#5A6B7F",
        "text-primary": "#F8FAFB",
        "text-secondary": "#A8B5C8",
        "text-muted": "#6B7A8F",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-card": "linear-gradient(135deg, #131820 0%, #1E2530 100%)",
        "gradient-primary": "linear-gradient(135deg, #00E5FF 0%, #0099CC 100%)",
        "gradient-success": "linear-gradient(135deg, #00FF88 0%, #00CC6E 100%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 229, 255, 0.25)",
        "glow-lg": "0 0 40px rgba(0, 229, 255, 0.35)",
        "glow-success": "0 0 24px rgba(0, 255, 136, 0.25)",
        "glow-danger": "0 0 24px rgba(255, 77, 77, 0.25)",
        card: "0 8px 32px rgba(0, 0, 0, 0.5)",
        "card-lg": "0 12px 48px rgba(0, 0, 0, 0.6)",
        "inner-card": "inset 0 1px 3px rgba(255, 255, 255, 0.05)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 24px rgba(0, 229, 255, 0.25)" },
          "50%": { boxShadow: "0 0 48px rgba(0, 229, 255, 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "7.5": "1.875rem",
      },
    },
  },
  plugins: [],
};
export default config;
