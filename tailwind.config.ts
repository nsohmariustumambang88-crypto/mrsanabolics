import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-familjen)', 'var(--font-archivo)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
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
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        field: {
          indigo: 'hsl(var(--field-indigo))',
          foreground: 'hsl(var(--on-field))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        /* The bath and the sheet, addressable directly */
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          raised: 'hsl(var(--paper-raised))',
          sunk: 'hsl(var(--paper-sunk))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
          faint: 'hsl(var(--ink-faint))',
        },
        /* Does not invert with the substrate — see --plate-ink in globals.css. */
        'plate-ink': 'hsl(var(--plate-ink))',
        rule: {
          DEFAULT: 'hsl(var(--rule))',
          strong: 'hsl(var(--rule-strong))',
        },

        /* Historical pigment set — the entire palette */
        pigment: {
          indigo: 'hsl(var(--pig-indigo))',
          'indigo-lift': 'hsl(var(--pig-indigo-lift))',
          madder: 'hsl(var(--pig-madder))',
          saffron: 'hsl(var(--pig-saffron))',
          verdigris: 'hsl(var(--pig-verdigris))',
          lampblack: 'hsl(var(--pig-lampblack))',
        },
      },
      boxShadow: {
        lift: 'var(--shadow-lift)',
        'lift-strong': 'var(--shadow-lift-strong)',
      },
      transitionTimingFunction: {
        /* The lift: fast contact, long settle. Exponential ease-out. */
        lift: 'cubic-bezier(0.16, 1, 0.3, 1)',
        spread: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        /* Pigment spreading outward from a single contact point */
        spread: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '60%': { opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        spread: 'spread 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    /* Let the deckle be switched off at a breakpoint where the seam is vertical. */
    function maskNone({ addUtilities }: any) {
      addUtilities({
        '.mask-none': { '-webkit-mask-image': 'none', 'mask-image': 'none' },
      });
    },
  ],
};
export default config;
