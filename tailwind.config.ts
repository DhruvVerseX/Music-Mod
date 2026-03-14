import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#07111f",
        mist: "#d7ecff",
        signal: "#6ee7b7",
        flare: "#ff8a5b",
        aurora: "#7dd3fc"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125, 211, 252, 0.18), 0 20px 80px rgba(4, 10, 24, 0.35)"
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"]
      }
    }
  },
  plugins: []
};

export default config;
