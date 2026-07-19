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
        // Module accent colours (from theme.css tokens)
        sage:    { DEFAULT: 'rgb(var(--accent-habits) / <alpha-value>)',   50: '#f2f7f3', 100: '#d6e8da', 200: '#b0d1b8', 300: '#87a68c', 400: '#6e9175', 500: '#567560' },
        coral:   { DEFAULT: 'rgb(var(--accent-fitness) / <alpha-value>)',  50: '#fef4f2', 100: '#fcd9d4', 200: '#f8b3aa', 300: '#e87c6e', 400: '#dc5f50', 500: '#c94535' },
        skyblue: { DEFAULT: 'rgb(var(--accent-sleep) / <alpha-value>)',    50: '#f0f8fc', 100: '#d2ecf7', 200: '#a8d8ee', 300: '#7db8d8', 400: '#5a9fc5', 500: '#3d85b0' },
        amber:   { DEFAULT: 'rgb(var(--accent-trading) / <alpha-value>)',  50: '#fdf9ee', 100: '#f8edcc', 200: '#f0d898', 300: '#d4a847', 400: '#c09030', 500: '#a87820' },
        softpurple: { DEFAULT: 'rgb(var(--accent-journal) / <alpha-value>)', 50: '#f8f4ff', 100: '#ece3fa', 200: '#d5c4f2', 300: '#b89edc', 400: '#a07dcc', 500: '#885fbe' },
        tealmt:  { DEFAULT: 'rgb(var(--accent-todos) / <alpha-value>)',    50: '#f0faf7', 100: '#ceede6', 200: '#9dd8ca', 300: '#64b4a0', 400: '#47988a', 500: '#307d71' },
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
        // cyan/lime/red/emerald used to be Tailwind's stock palette, kept
        // as a stand-in for accent/success/danger because their default hex
        // happened to equal the (dark-theme-only) design tokens. That's why
        // every bg-cyan-400 / text-lime-400 / border-red-400 / emerald-*
        // class across the app stayed frozen on the old theme after a
        // switch — remapped here to the live per-theme RGB triplets so
        // every existing usage of these names becomes theme-reactive with
        // no per-component JSX changes needed.
        cyan: {
          50: 'rgb(var(--accent-rgb) / <alpha-value>)', 100: 'rgb(var(--accent-rgb) / <alpha-value>)',
          200: 'rgb(var(--accent-rgb) / <alpha-value>)', 300: 'rgb(var(--accent-rgb) / <alpha-value>)',
          400: 'rgb(var(--accent-rgb) / <alpha-value>)', 500: 'rgb(var(--accent-rgb) / <alpha-value>)',
          600: 'rgb(var(--accent-rgb) / <alpha-value>)', 700: 'rgb(var(--accent-rgb) / <alpha-value>)',
          800: 'rgb(var(--accent-rgb) / <alpha-value>)', 900: 'rgb(var(--accent-rgb) / <alpha-value>)',
          950: 'rgb(var(--accent-rgb) / <alpha-value>)',
        },
        lime: {
          50: 'rgb(var(--success-rgb) / <alpha-value>)', 100: 'rgb(var(--success-rgb) / <alpha-value>)',
          200: 'rgb(var(--success-rgb) / <alpha-value>)', 300: 'rgb(var(--success-rgb) / <alpha-value>)',
          400: 'rgb(var(--success-rgb) / <alpha-value>)', 500: 'rgb(var(--success-rgb) / <alpha-value>)',
          600: 'rgb(var(--success-rgb) / <alpha-value>)', 700: 'rgb(var(--success-rgb) / <alpha-value>)',
          800: 'rgb(var(--success-rgb) / <alpha-value>)', 900: 'rgb(var(--success-rgb) / <alpha-value>)',
          950: 'rgb(var(--success-rgb) / <alpha-value>)',
        },
        red: {
          50: 'rgb(var(--danger-rgb) / <alpha-value>)', 100: 'rgb(var(--danger-rgb) / <alpha-value>)',
          200: 'rgb(var(--danger-rgb) / <alpha-value>)', 300: 'rgb(var(--danger-rgb) / <alpha-value>)',
          400: 'rgb(var(--danger-rgb) / <alpha-value>)', 500: 'rgb(var(--danger-rgb) / <alpha-value>)',
          600: 'rgb(var(--danger-rgb) / <alpha-value>)', 700: 'rgb(var(--danger-rgb) / <alpha-value>)',
          800: 'rgb(var(--danger-rgb) / <alpha-value>)', 900: 'rgb(var(--danger-rgb) / <alpha-value>)',
          950: 'rgb(var(--danger-rgb) / <alpha-value>)',
        },
        emerald: {
          300: 'rgb(var(--success-rgb) / <alpha-value>)', 400: 'rgb(var(--success-rgb) / <alpha-value>)',
          500: 'rgb(var(--success-rgb) / <alpha-value>)', 600: 'rgb(var(--success-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
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
        'logo-breathe': 'logoBreathe 4s ease-in-out infinite',
        'watercolor': 'watercolorShift 18s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out both',
        'bar-fill': 'barFill 2.5s ease-out both',
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
        logoBreathe: {
          '0%, 100%': { transform: 'scale(1.00)' },
          '50%':       { transform: 'scale(1.03)' },
        },
        watercolorShift: {
          '0%':   { transform: 'scale(1)    rotate(0deg)',   opacity: '0.18' },
          '33%':  { transform: 'scale(1.08) rotate(4deg)',   opacity: '0.24' },
          '66%':  { transform: 'scale(0.96) rotate(-3deg)', opacity: '0.20' },
          '100%': { transform: 'scale(1)    rotate(0deg)',   opacity: '0.18' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        barFill: {
          '0%':   { width: '0%' },
          '30%':  { width: '45%' },
          '70%':  { width: '72%' },
          '90%':  { width: '88%' },
          '100%': { width: '95%' },
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
