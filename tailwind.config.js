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
          "0%": { transform: "scale(0.6) rotate(-12deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
        fillIn: {
          from: { width: "0%" },
        },
      },
      animation: {
        popIn: "popIn 0.25s ease",
        fillIn: "fillIn 0.5s ease",
      },
    },
  },
  plugins: [],
};
