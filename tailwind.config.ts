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
        primary: {
          DEFAULT: "#D97706",
          light: "#F59E0B",
          dark: "#B45309",
        },
        sidebar: {
          DEFAULT: "#1C1917",
          hover: "#292524",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F5F5F4",
        },
        background: "#FAFAF9",
        foreground: "#1C1917",
        muted: "#78716C",
        border: "#E7E5E4",
        success: "#16A34A",
        danger: "#DC2626",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
