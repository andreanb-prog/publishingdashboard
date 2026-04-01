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
          DEFAULT: '#1E2D3D',
          2: '#253647',
          3: '#2e4157',
        },
        amber: {
          brand: '#E9A020',
          light: '#f5c55a',
          pale: '#fdf5e3',
        },
        cream: '#FFF8F0',
        // AuthorDash palette
        coral:  '#F97B6B',
        peach:  '#F4A261',
        plum:   '#8B5CF6',
        teal:   '#5BBFB5',
        sky:    '#60A5FA',
        sage:   '#6EBF8B',
        rose:   '#F472B6',
        'warm-border': '#F0E0C8',
        // Dark theme
        dk: {
          bg: '#0c0a09',
          surface: '#1c1917',
          surface2: '#292524',
          surface3: '#44403c',
          text: '#fafaf9',
          text2: '#d6d3d1',
          text3: '#a8a29e',
          rose: '#F97B6B',
          amber: '#E9A020',
          emerald: '#6EBF8B',
          sky: '#60A5FA',
          violet: '#8B5CF6',
          teal: '#5BBFB5',
        },
      },
    },
  },
  plugins: [],
}
