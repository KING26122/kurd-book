/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Kufi Arabic"', 'Tahoma', 'system-ui', 'sans-serif'],
        display: ['"Noto Kufi Arabic"', 'Tahoma', 'sans-serif'],
        naskh: ['"Noto Naskh Arabic"', 'Tahoma', 'serif'],
      },
      colors: {
        app: 'var(--bg)',
        elevated: 'var(--bg-elev)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        line: 'var(--border)',
        primary: 'var(--primary)',
        primaryFg: 'var(--primary-fg)',
        accent: 'var(--accent)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        glow: '0 0 0 1px var(--border), 0 18px 60px -24px var(--glow)',
        lift: '0 22px 50px -30px rgba(0,0,0,.65)',
      },
      backgroundImage: {
        'brand-gradient': 'var(--gradient)',
        'aurora': 'var(--aurora)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pop: {
          '0%': { transform: 'scale(.8)', opacity: '0' },
          '70%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        heart: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.45) rotate(-8deg)' },
          '65%': { transform: 'scale(.92) rotate(4deg)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) rotate(40deg) scale(.2)', opacity: '0' },
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pop: 'pop .28s ease-out both',
        heart: 'heart .45s ease-out',
        shimmer: 'shimmer 2.4s linear infinite',
        wave: 'wave 1s ease-in-out infinite',
        slideUp: 'slideUp .35s ease-out both',
        confetti: 'confetti 1.1s ease-out forwards',
        spinSlow: 'spinSlow 18s linear infinite',
        marquee: 'marquee 24s linear infinite',
      },
    },
  },
  plugins: [],
};
