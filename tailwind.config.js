/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Teal Color Palette - #1A656D
        'codeat-teal': {
          50: '#e8f0f0',
          100: '#bad1d3',
          200: '#8db2b6',
          300: '#5f9399',
          400: '#31747c',
          500: '#1A656D',
          600: '#175b62',
          700: '#12474c',
          800: '#0d3337',
          900: '#081e21',
          DEFAULT: '#1A656D',
        },
        // Background Colors
        'codeat-bg': {
          light: '#F6FBFB',
          dark: '#0A2A2D',
          DEFAULT: '#0A2A2D',
        },
        // Semantic color mappings (used throughout the app)
        'codeat-dark': '#030a0b',        // Darkest background
        'codeat-mid': '#0A2A2D',          // Card/panel backgrounds  
        'codeat-muted': '#0d3337',        // Borders and muted elements
        'codeat-accent': '#31747c',       // Accent/highlight color
        'codeat-silver': '#F6FBFB',       // Primary text color
        'codeat-gray': '#8db2b6',         // Secondary text color
      },
      animation: {
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.5' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(26, 101, 109, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(26, 101, 109, 0.5)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scaleIn': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-teal': 'linear-gradient(135deg, #1A656D 0%, #31747c 100%)',
        'gradient-dark': 'radial-gradient(ellipse at top, #1A656D, #0A2A2D 60%)',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(26, 101, 109, 0.4)',
        'glow-sm': '0 0 10px rgba(26, 101, 109, 0.3)',
        'glow-lg': '0 0 40px rgba(26, 101, 109, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(26, 101, 109, 0.2)',
        'teal': '0 4px 15px rgba(26, 101, 109, 0.4)',
        'teal-lg': '0 8px 25px rgba(26, 101, 109, 0.5)',
        'card': '0 8px 32px rgba(8, 30, 33, 0.4)',
        'card-hover': '0 12px 40px rgba(26, 101, 109, 0.3)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      borderColor: {
        'teal-glow': 'rgba(26, 101, 109, 0.4)',
      },
    },
  },
  plugins: [],
}
