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
        'codeat-dark': '#282b2f',
        'codeat-mid': '#373c42',
        'codeat-muted': '#47494d',
        'codeat-teal': '#344a51',
        'codeat-accent': '#00b3c6',
        'codeat-silver': '#e0e1e1',
        'codeat-gray': '#9da0a1',
      },
    },
  },
  plugins: [],
}

