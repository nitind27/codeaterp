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
        'codeat-dark': '#030712',
        'codeat-mid': '#0f172a',
        'codeat-muted': '#1e293b',
        'codeat-teal': '#22d3ee',
        'codeat-accent': '#c084fc',
        'codeat-silver': '#f8fafc',
        'codeat-gray': '#94a3b8',
      },
    },
  },
  plugins: [],
}

