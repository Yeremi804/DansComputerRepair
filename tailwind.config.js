/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // include all your src files
  ],
  theme: {
    extend: {
      colors:{
        'main-bg': '#FFFFFF',      // Light mode
        'main-dark': '#121212',    // Dark mode
        'main-text': '#d3dae3',
        'text-dark': '#e5e7eb',
    },
      keyframes: {
        // 🔴 Shake animation for error banner
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
        // 🟢 Fade-in animation for success banner
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shake: "shake 0.3s ease-in-out",
        fadeIn: "fadeIn 0.4s ease-out",
      },
    },
  },
  plugins: [],
};