import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#121214',
        surfaceHover: '#1c1c1f',
        border: '#27272a',
        textMain: '#ededed',
        textMuted: '#a1a1aa',
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        accent: '#8b5cf6',
      },
      fontFamily: {
        mono: ['var(--font-jetbrains-mono)'],
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [],
}
export default config
