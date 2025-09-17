import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    // Allow overriding base via env (e.g., VITE_BASE or BASE)
    base: process.env.VITE_BASE || process.env.BASE || "/",
    plugins: [react()],
    server: {
        port: 5173,
        open: false,
    },
});
