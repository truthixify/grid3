import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0B0E11",
          "container-low": "#101417",
          container: "#161A1E",
          "container-high": "#1C2024",
          "container-highest": "#22262B",
          variant: "#22262B",
        },
        "on-surface": {
          DEFAULT: "#F8F9FE",
          variant: "#A9ABAF",
        },
        outline: {
          DEFAULT: "#737679",
          variant: "#45484C",
        },
        primary: {
          DEFAULT: "#69DAFF",
          container: "#00CFFC",
          dim: "#00C0EA",
        },
        secondary: {
          DEFAULT: "#D674FF",
          container: "#9900CF",
          dim: "#BB00FC",
        },
        tertiary: "#89A5FF",
        error: {
          DEFAULT: "#FF716C",
          container: "#9F0519",
        },
        "on-primary-fixed": "#002A35",
      },
      fontFamily: {
        headline: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        sm: "0.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
