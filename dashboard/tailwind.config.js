/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                primary: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
                surface: {
                    DEFAULT: '#ffffff',
                    muted: '#f8fafc',
                    raised: '#ffffff',
                    dark: '#0b1120',
                    'dark-muted': '#111827',
                    'dark-raised': '#151f32',
                },
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                '3xl': '20px',
            },
            boxShadow: {
                'soft': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
                'medium': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
                'elevated': '0 4px 12px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.08)',
                'modal': '0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)',
                'modal-dark': '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                'glow-primary': '0 0 0 3px rgba(99,102,241,0.15), 0 1px 2px rgba(0,0,0,0.05)',
                'glow-danger': '0 0 0 3px rgba(239,68,68,0.15), 0 1px 2px rgba(0,0,0,0.05)',
            },
            keyframes: {
                'modal-enter': {
                    '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                'backdrop-enter': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up-spring': {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '60%': { opacity: '1', transform: 'translateY(-2px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'modal-enter': 'modal-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                'backdrop-enter': 'backdrop-enter 0.2s ease-out',
                'slide-up-spring': 'slide-up-spring 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },
    plugins: [],
}
