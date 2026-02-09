/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cge-sidebar': '#A05646',    // Marrón Terracota
                'cge-red': '#C82A2A',        // Rojo Carmesí (Alertas/Críticas)
                'cge-blue': '#75AADB',       // Celeste Argentina (Acción)
                'cge-yellow': '#F4B63D',     // Amarillo Sol (Pendientes)
                'cge-bg': '#F4F6F8',         // Gris Perla (Fondo Light)

                // Professional Dark Theme (Slate Palette)
                'dark-bg': '#0F172A',        // Slate 900
                'dark-card': '#1E293B',      // Slate 800
                'dark-border': '#334155',    // Slate 700
                'dark-text-primary': '#F8FAFC', // Slate 50
                'dark-text-secondary': '#94A3B8', // Slate 400
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
