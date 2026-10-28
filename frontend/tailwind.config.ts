import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:        '#12306B',
        'deep-navy': '#0B2455',
        saffron:     '#FF9933',
        'tri-green': '#138808',
        ink:         '#1A2233',
        muted:       '#3B4659',
        border:      '#C3CCDC',
        'panel-header': '#E4EAF4',
        tint:        '#F5F7FB',
        'utility-bar': '#EEF1F6',
        // Status colours
        'status-green':  '#0B6B2A',
        'status-red':    '#B3261E',
        'status-amber':  '#8A4B00',
        'status-slate':  '#3B4659',
      },
      fontFamily: {
        sans:  ['Mukta', 'sans-serif'],
        mono:  ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        'body':  ['15px', { lineHeight: '1.6' }],
        'h1':    ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'h2':    ['17px', { lineHeight: '1.4', fontWeight: '700' }],
        'table': ['14.5px', { lineHeight: '1.5' }],
        'mono':  ['12.5px', { lineHeight: '1.4' }],
        'chip':  ['11.5px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
      },
      maxWidth: {
        content: '1376px',
      },
    },
  },
  plugins: [],
}

export default config
