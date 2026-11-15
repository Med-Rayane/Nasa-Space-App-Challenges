/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05060a',
        ink: '#090b11',
        bone: '#f2efe8',
        muted: '#8b8f9a',
        gold: '#d9aa63',
        signal: '#7fb2ff',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        ultra: '0.4em',
      },
      screens: {
        '3xl': '1800px',
      },
    },
  },
  plugins: [],
}
