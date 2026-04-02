/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: {
        extend: {
            colors: {
                base: "#050a18",
                surface: "#0a1128",
                surfaceLight: "#0f1a3a",
                accent: "#3b82f6",
                accentLight: "#60a5fa",
                accentDim: "#1e3a5f",
                accentGlow: "#2563eb",
                danger: "#f43f5e",
                success: "#22c55e",
                muted: "rgba(148, 163, 184, 0.6)"
            },
            fontFamily: {
                heading: ["Plus Jakarta Sans", "sans-serif"],
                body: ["Plus Jakarta Sans", "sans-serif"],
                mono: ["IBM Plex Mono", "monospace"]
            },
            boxShadow: {
                glow: "0 0 40px rgba(59, 130, 246, 0.15)",
                soft: "0 4px 24px rgba(0, 0, 0, 0.3)",
                inner: "inset 0 1px 0 rgba(255,255,255,0.05)"
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))"
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "shimmer": "shimmer 2s linear infinite"
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-6px)" }
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" }
                }
            }
        }
    },
    plugins: []
};
