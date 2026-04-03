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
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: {
          DEFAULT: 'var(--color-navy)',
          2: '#253647',
          3: '#2e4157',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
          brand:   'var(--color-amber)',
          light:   '#f5c55a',
          pale:    '#fdf5e3',
        },
        cream:  'var(--color-cream)',
        sage:   'var(--color-sage)',
        coral:  'var(--color-coral)',
        peach:  'var(--color-peach)',
        plum:   'var(--color-plum)',
        teal:   'var(--color-teal)',
        sky:    'var(--color-sky)',
        rose:   'var(--color-rose)',
        'warm-border': '#EEEBE6',
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
