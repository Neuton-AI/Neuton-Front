/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#CC785C',
          'primary-active': '#A9583E',
          'primary-disabled': '#E6DFD8',
          teal: '#5DB8A6',
          amber: '#E8A55A',
        },
        surface: {
          canvas: '#FAF9F5',
          soft: '#F5F0E8',
          card: '#EFE9DE',
          'cream-strong': '#E8E0D2',
          dark: '#181715',
          'dark-elevated': '#252320',
          'dark-soft': '#1F1E1B',
        },
        ink: {
          DEFAULT: '#141413',
          strong: '#252523',
          body: '#3D3D3A',
          muted: '#6C6A64',
          'muted-soft': '#8E8B82',
          'on-primary': '#FFFFFF',
          'on-dark': '#FAF9F5',
          'on-dark-soft': '#A09D96',
        },
        hairline: {
          DEFAULT: '#E6DFD8',
          soft: '#EBE6DF',
        },
        semantic: {
          success: '#5DB872',
          warning: '#D4A017',
          error: '#C64545',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Design scale lifted from the OpenPencil type ramp.
        eyebrow: ['12px', { lineHeight: '17px', letterSpacing: '1.5px' }],
        label: ['13px', { lineHeight: '18px' }],
        body: ['15px', { lineHeight: '22px' }],
        title: ['36px', { lineHeight: '1.21', letterSpacing: '-0.5px' }],
        'card-value': ['28px', { lineHeight: '34px', letterSpacing: '-0.3px' }],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        pill: '9999px',
      },
      spacing: {
        nav: '84px',
      },
      maxWidth: {
        shell: '420px',
      },
    },
  },
  plugins: [],
};