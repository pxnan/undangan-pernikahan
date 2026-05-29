import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#fff7fa",
          100: "#ffe8f0",
          200: "#ffd0df",
          300: "#f7a9c3",
          400: "#ef7fa6",
          500: "#dd5f8c",
          600: "#bf426f"
        },
        warmgray: "#f5f3f4"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 24px 70px rgba(190, 66, 111, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
