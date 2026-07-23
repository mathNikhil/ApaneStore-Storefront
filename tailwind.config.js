/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#006d2f",
        "primary-container": "#25D366",
        "on-primary-container": "#005523",
      },
    },
  },
  plugins: [],
};
