/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
  navy: {
    DEFAULT: '#0d1f35',
    2: '#162d47',
    3: '#243d5c',
  },
  amber: {
    brand: '#e9a020',
    light: '#f5c55a',
    pale: '#fdf5e3',
  },
  cream: '#f7f5f1',
        // Dark theme
        dk: {
          bg: '#0c0a09',
          surface: '#1c1917',
          surface2: '#292524',
          surface3: '#44403c',
          text: '#fafaf9',
          text2: '#d6d3d1',
          text3: '#a8a29e',
          rose: '#fb7185',
          amber: '#fbbf24',
          emerald: '#34d399',
          sky: '#38bdf8',
          violet: '#a78bfa',
        },
      },
    },
  },
  plugins: [],
}
