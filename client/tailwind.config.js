/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                base: "#05070d",
                panel: "#0d1220",
                panelSoft: "#111931",
                neon: "#00ffd1",
                neon2: "#4de0ff",
                danger: "#ff4f7a"
            },
            fontFamily: {
                heading: ["Sora", "sans-serif"],
                body: ["Space Grotesk", "sans-serif"]
            },
            boxShadow: {
                neon: "0 0 0 1px rgba(0,255,209,0.4), 0 0 28px rgba(0,255,209,0.15)"
            }
        }
    },
    plugins: []
};
