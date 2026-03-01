import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#FF4500',
          'orange-dark': '#CC3700',
          blue: '#0079D3',
        },
      },
    },
  },
  plugins: [],
};

export default config;
