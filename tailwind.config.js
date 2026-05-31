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
        background: 'var(--background)',
        card: 'var(--card)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        text: 'var(--text)',
        white: 'rgb(var(--color-white) / <alpha-value>)',
        navy: {
          50: 'rgb(var(--color-navy-50) / <alpha-value>)',
          100: 'rgb(var(--color-navy-100) / <alpha-value>)',
          200: 'rgb(var(--color-navy-200) / <alpha-value>)',
          300: 'rgb(var(--color-navy-300) / <alpha-value>)',
          400: 'rgb(var(--color-navy-400) / <alpha-value>)',
          500: 'rgb(var(--color-navy-500) / <alpha-value>)',
          600: 'rgb(var(--color-navy-600) / <alpha-value>)',
          700: 'rgb(var(--color-navy-700) / <alpha-value>)',
          800: 'rgb(var(--color-navy-800) / <alpha-value>)',
          900: 'rgb(var(--color-navy-900) / <alpha-value>)',
          950: 'rgb(var(--color-navy-950) / <alpha-value>)',
        },
        cyber: {
          50: 'rgb(var(--color-cyber-50) / <alpha-value>)',
          100: 'rgb(var(--color-cyber-100) / <alpha-value>)',
          200: 'rgb(var(--color-cyber-200) / <alpha-value>)',
          300: 'rgb(var(--color-cyber-300) / <alpha-value>)',
          400: 'rgb(var(--color-cyber-400) / <alpha-value>)',
          500: 'rgb(var(--color-cyber-500) / <alpha-value>)',
          600: 'rgb(var(--color-cyber-600) / <alpha-value>)',
          700: 'rgb(var(--color-cyber-700) / <alpha-value>)',
          800: 'rgb(var(--color-cyber-800) / <alpha-value>)',
          900: 'rgb(var(--color-cyber-900) / <alpha-value>)',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34,211,238,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(34,211,238,0.2)' },
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'cyber': '0 0 20px rgba(34,211,238,0.3)',
        'card': '0 2px 20px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
