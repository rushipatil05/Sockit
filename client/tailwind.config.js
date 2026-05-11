/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                base: "#0B0F14",
                surface: "#111827",
                "surface-light": "#1f2937",
                accent: "#00FFA3",
                secondary: "#00C2FF",
                "text-primary": "#E5E7EB",
                "text-secondary": "#9CA3AF",
                danger: "#f43f5e",
                success: "#22c55e",
                muted: "#9CA3AF"
            },
            fontFamily: {
                heading: ["Plus Jakarta Sans", "sans-serif"],
                body: ["Plus Jakarta Sans", "sans-serif"],
                mono: ["IBM Plex Mono", "monospace"]
            },
            boxShadow: {
                soft: "0 4px 24px rgba(0, 0, 0, 0.3)",
                inner: "inset 0 1px 0 rgba(255,255,255,0.05)"
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))"
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite"
            }
        }
    },
    plugins: []
};
