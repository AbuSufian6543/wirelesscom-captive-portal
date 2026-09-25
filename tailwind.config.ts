import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        line: "#e2e8f0",
      },
    },
  },
  plugins: [],
};

export default config;
