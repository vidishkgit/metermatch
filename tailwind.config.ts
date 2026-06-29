import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070A12",
          900: "#0B0F1A",
          850: "#0F1422",
          800: "#141A2B",
          700: "#1C2436",
          600: "#2A3450",
        },
        accent: {
          DEFAULT: "#6366F1",
          violet: "#8B5CF6",
          teal: "#2DD4BF",
          emerald: "#34D399",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -10px rgba(99,102,241,0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 6px 20px -14px rgba(0,0,0,0.7)",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(2000%)", opacity: "0" },
        },
        flow: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        rise: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        scanline: "scanline 1.6s ease-in-out",
        flow: "flow 3s linear infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
