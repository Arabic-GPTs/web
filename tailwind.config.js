/** @type {import('tailwindcss').Config} */
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import aspectRatio from "@tailwindcss/aspect-ratio";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}"
    ],
    safelist: [
        // تمكين ألوان التدرّج الديناميكية القادمة من JSON
        {
            pattern:
                /(from|via|to)-(zinc|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|nvidia)-(100|200|300|400|500|600|700|800|900)/,
        },
        // اتجاهات شائعة للتدرّجات
        "bg-gradient-to-r",
        "bg-gradient-to-l",
        "bg-gradient-to-t",
        "bg-gradient-to-b",
        "bg-gradient-to-tr",
        "bg-gradient-to-br",
        "bg-gradient-to-tl",
        "bg-gradient-to-bl",
    ],
    theme: {
        extend: {
            colors: {
                base: {
                    950: "#0b0b0c",
                    900: "#0f1012"
                },
                nvidia: {
                    50: "#f2ffe0",
                    100: "#e6ffc2",
                    200: "#cfff89",
                    300: "#b6f35f",
                    400: "#9fe638",
                    500: "#86d115",
                    600: "#76b900", // Brand
                    700: "#5c8f00",
                    800: "#436700",
                    900: "#2d4500",
                },
                surface: {
                    900: "#0a0d0a",
                    800: "#0f130f",
                    700: "#141914",
                    600: "#191f19",
                }
            },
            fontFamily: {
                arabic: ['"Cairo"', '"Noto Sans Arabic"', "system-ui", "sans-serif"]
            },
            boxShadow: {
                'nv-glow': '0 10px 30px -10px rgba(118, 185, 0, 0.35)',
            }
        }
    },
    plugins: [
        forms,
        typography,
        aspectRatio,
    ]
};
