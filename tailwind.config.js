/** RelayDesk design system — see design-system/relaydesk/MASTER.md (bright white + vibrant purple, light only). */

// Neutrals are purple-tinted so every existing slate/gray class follows the brand; ink #32136B and muted #75658F
// pass 4.5:1 on white. 400 is kept accessible (it is used for secondary text across the app).
const neutral = {
  50: '#FBF9FF', 100: '#F5F1FD', 200: '#E9DFFF', 300: '#D8C8FF', 400: '#7E6E99', 500: '#75658F',
  600: '#5F4F7C', 700: '#4A3A6B', 800: '#3B2A5E', 900: '#32136B', 950: '#2A1060',
}
const brand = {
  50: '#F8F5FF', 100: '#F1EBFF', 200: '#E2D6FF', 300: '#C9B3FF', 400: '#A78BFA', 500: '#8B5CF6',
  600: '#6C3BFF', 700: '#5A2BE6', 800: '#4520B8', 900: '#32136B', 950: '#2A1060',
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: neutral,
        gray: neutral,
        purple: brand,
        violet: brand,
        rd: {
          bg: '#FFFFFF', surface: '#F8F5FF', lavender: '#F1EBFF', border: '#E9DFFF', 'border-strong': '#D8C8FF',
          primary: '#6C3BFF', 'primary-hover': '#5A2BE6', violet: '#8B5CF6', bright: '#9747FF', ink: '#32136B', muted: '#75658F',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'rd-sm': '0 1px 2px rgba(50,19,107,.06)',
        'rd-md': '0 12px 32px -20px rgba(108,59,255,.35)',
        'rd-lg': '0 24px 48px -24px rgba(108,59,255,.45)',
        'rd-glow': '0 14px 28px -12px rgba(108,59,255,.55)',
      },
      backgroundImage: {
        'rd-brand': 'linear-gradient(135deg, #6C3BFF 0%, #8B5CF6 55%, #9747FF 100%)',
        'rd-soft': 'linear-gradient(180deg, #F8F5FF 0%, #FFFFFF 100%)',
      },
    },
  },
  plugins: [],
}
