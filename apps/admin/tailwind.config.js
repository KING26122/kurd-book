/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Kufi Arabic"', 'Tahoma', 'system-ui', 'sans-serif'],
        display: ['"Noto Kufi Arabic"', 'Tahoma', 'sans-serif'],
      },
      colors: {
        app: 'var(--bg)',
        elevated: 'var(--bg-elev)',
        panel: 'var(--panel)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted-2)',
        line: 'var(--border)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      boxShadow: {
        glow: '0 0 0 1px var(--border), 0 22px 60px -30px var(--glow)',
        card: '0 30px 80px -50px rgba(0,0,0,.9)',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.55' },
        },
      },
      animation: {
        slideUp: 'slideUp .3s ease-out both',
        shimmer: 'shimmer 2s linear infinite',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
