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
        background: '#06080D',
        surface: {
          DEFAULT: '#0E131F',
          hover: '#151C2C',
          active: '#1D273D',
          glass: 'rgba(14, 19, 31, 0.65)',
          'glass-elevated': 'rgba(20, 27, 43, 0.78)',
          border: 'rgba(255, 255, 255, 0.12)'
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0A84FF', // Apple iOS Primary Electric Blue
          600: '#0070E0',
          700: '#0058B3',
        },
        accent: {
          green: '#30D158', // Apple iOS Neon Emerald
          amber: '#FF9F0A', // Apple iOS Sunset Amber
          rose: '#FF453A',  // Apple iOS Crisp Red
          purple: '#BF5AF2',// Apple iOS Electric Purple
          cyan: '#00D2FF',  // Apple iOS Neon Cyan
          teal: '#64D2FF'
        },
        'ios-amber': '#FF9F0A',
        'ios-emerald': '#30D158',
        'ios-electric': '#0A84FF',
        'ios-purple': '#BF5AF2',
        'ios-rose': '#FF453A',
        'ios-cyan': '#00D2FF'
      },
      borderRadius: {
        '2xl': '1.25rem',   // 20px
        '3xl': '1.75rem',   // 28px
        '4xl': '2.25rem',   // 36px
        'squircle': '1.5rem'
      },
      boxShadow: {
        'glow-cyan': '0 0 30px -5px rgba(0, 210, 255, 0.35)',
        'glow-brand': '0 0 30px -5px rgba(10, 132, 255, 0.35)',
        'glow-amber': '0 0 30px -5px rgba(255, 159, 10, 0.35)',
        'glow-green': '0 0 30px -5px rgba(48, 209, 88, 0.35)',
        'glow-purple': '0 0 30px -5px rgba(191, 90, 242, 0.35)',
        'glow-rose': '0 0 30px -5px rgba(255, 69, 58, 0.35)',
        'ambient': '0 20px 50px -12px rgba(0, 0, 0, 0.65)',
        'ambient-sm': '0 8px 24px -8px rgba(0, 0, 0, 0.5)',
        'glass': '0 12px 40px 0 rgba(0, 0, 0, 0.45)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.12)',
        'ios-ambient': '0 12px 32px -8px rgba(0, 0, 0, 0.45)',
        'ios-diffuse': '0 20px 48px -12px rgba(0, 0, 0, 0.6)',
        'ios-glow-amber': '0 0 25px -4px rgba(255, 159, 10, 0.4)'
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      }
    },
  },
  plugins: [],
}

