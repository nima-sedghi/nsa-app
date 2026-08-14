/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182338",
        inkdark: "#101828",
        panel: "#22304E",
        border: "#35446A",
        parchment: "#EFE8D8",
        parchmentlight: "#FBF8EF",
        parchmentborder: "#C9BFA0",
        gold: "#C79A2B",
        stamp: "#A23B2E",
        good: "#3B6D11",
      },
      fontFamily: {
        sans: ["Vazirmatn", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      keyframes: {
        popIn: {
          "0%": { transform: "scale(0.6) rotate(-10deg)", opacity: "0" },
          "60%": { transform: "scale(1.08) rotate(-10deg)" },
          "100%": { transform: "scale(1) rotate(-10deg)", opacity: "1" },
        },
        fillIn: {
          from: { width: "0%" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        softPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.06)" },
        },
      },
      animation: {
        popIn: "popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        fillIn: "fillIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        fadeInUp: "fadeInUp 0.45s ease both",
        fadeIn: "fadeIn 0.3s ease both",
        softPulse: "softPulse 0.5s ease",
      },
    },
  },
  plugins: [],
};
