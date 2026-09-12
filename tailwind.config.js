/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "nh-black": "#0a0a0c",
        "nh-card": "#141721",
        "nh-cyan": "#00E5FF",
        "nh-blue": "#3B82F6",
        "nh-muted": "#8b93a7",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 229, 255, 0.25)",
      },
      keyframes: {
        "stroke-draw": {
          "0%": { strokeDashoffset: "600" },
          "100%": { strokeDashoffset: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", filter: "drop-shadow(0 0 8px rgba(0,229,255,0.4))" },
          "50%": { opacity: "1", filter: "drop-shadow(0 0 28px rgba(0,229,255,0.9))" },
        },
      },
      animation: {
        "stroke-draw": "stroke-draw 1.2s ease-out forwards",
        "pulse-glow": "pulse-glow 1.3s ease-in-out 1.2s 1",
      },
    },
  },
  plugins: [],
};
