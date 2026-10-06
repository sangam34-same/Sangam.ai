/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#050505',
          surface: '#0d0d11',
          card: '#121218',
          border: '#1f1f2a',
          orange: '#ff5500',
          accent: '#8b5cf6',
          cyan: '#06b6d4',
          emerald: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'beam-drift': 'beamDrift 8s ease-in-out infinite alternate',
        'aurora-pulse': 'auroraPulse 10s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        beamDrift: {
          '0%': { transform: 'rotate(32deg) translateY(-20px) scale(0.98)' },
          '100%': { transform: 'rotate(35deg) translateY(20px) scale(1.05)' },
        },
        auroraPulse: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: '0.55' },
          '50%': { transform: 'translate(-50%, -50%) scale(1.15) rotate(12deg)', opacity: '0.75' },
        },
      },
    },
  },
  plugins: [],
}