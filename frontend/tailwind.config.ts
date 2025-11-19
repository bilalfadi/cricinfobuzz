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
        cricbuzz: {
          green: '#2d5016',
          'green-light': '#3d6b1f',
          'green-dark': '#1f350f',
        },
      },
    },
  },
  plugins: [],
};
export default config;

