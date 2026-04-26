/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#657fad',    // Medium Blue - для теней, текста и иконок
          secondary: '#002666',  // Dark Blue - самый темный для текста и важных акцентов
          soft: '#c8d3e6',       // Light Blue - для плашек и не очень важного текста
          accent: '#ad0000',     // Red - минимально, только в акцентных местах
          bg: '#f0f4f8',         // Светлый фон (светло-голубой оттенок для лучшей видимости)
        },
        status: {
          success: '#10b981',
          warning: '#f59e0b', 
          error: '#ad0000',      // Red - используется также для ошибок
        }
      },
      boxShadow: {
        'premium': '0 20px 50px -12px rgba(101, 127, 173, 0.15)', // Shadow based on #657fad
        'hover': '0 30px 60px -12px rgba(101, 127, 173, 0.25)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}