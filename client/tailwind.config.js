/** @type {import('tailwindcss').Config} */
export default {
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
                'cge-bg': '#F4F6F8',         // Gris Perla (Fondo)
                // White is standard 'white'
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
