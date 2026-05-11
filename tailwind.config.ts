import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BlockSense teal primary
        teal: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        // Slate neutrals
        slate: {
          50:  "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        // Status colors
        success: {
          bg:     "#ECFDF5",
          fg:     "#047857",
          border: "#10B981",
          DEFAULT: "#047857",
        },
        warning: {
          bg:     "#FFFBEB",
          fg:     "#B45309",
          border: "#F59E0B",
          DEFAULT: "#B45309",
        },
        error: {
          bg:     "#FEF2F2",
          fg:     "#B91C1C",
          border: "#EF4444",
          DEFAULT: "#B91C1C",
        },
        info: {
          bg:     "#EFF6FF",
          fg:     "#1D4ED8",
          border: "#3B82F6",
          DEFAULT: "#1D4ED8",
        },
        // shadcn semantic tokens
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // Legacy utility colors
        critical: "#B91C1C",
        water: "#1D4ED8",
        power: "#B45309",
        gas:   "#0D9488",
        sewage: "#993C1D",
        waste:  "#993556",
        garbage: "#047857",
      },
      borderRadius: {
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        "2xl": "20px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15,23,42,0.04)",
        sm: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        md: "0 4px 6px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.04)",
        lg: "0 10px 15px rgba(15,23,42,0.06), 0 4px 6px rgba(15,23,42,0.04)",
        xl: "0 20px 25px rgba(15,23,42,0.08), 0 8px 10px rgba(15,23,42,0.04)",
      },
      transitionDuration: {
        fast:   "100ms",
        base:   "150ms",
        slow:   "200ms",
        slower: "300ms",
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        out:      "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
        spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
        DEFAULT:  "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-12px) rotate(1deg)" },
          "66%": { transform: "translateY(-6px) rotate(-1deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(13,148,136,0.2)" },
          "50%":      { boxShadow: "0 0 40px rgba(13,148,136,0.5), 0 0 80px rgba(13,148,136,0.15)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "count-up":       "count-up 0.4s ease-out forwards",
        float:            "float 6s ease-in-out infinite",
        "pulse-glow":     "pulse-glow 3s ease-in-out infinite",
        shimmer:          "shimmer 2.5s ease-in-out infinite",
        "fade-up":        "fade-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
