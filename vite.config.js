import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const CHARSET_SENSITIVE_TYPES = /^(text\/html|application\/json|application\/javascript|text\/javascript|text\/css|application\/xml|image\/svg\+xml)/i;
const appendCharset = (value) => {
    if (typeof value !== "string") return value;
    if (!CHARSET_SENSITIVE_TYPES.test(value)) return value;
    return /charset=/i.test(value) ? value : `${value}; charset=utf-8`;
};

const normalizeContentType = (value) => {
    if (Array.isArray(value)) {
        return value.map((entry) => (typeof entry === "string" ? appendCharset(entry) : entry));
    }
    return appendCharset(value);
};

const forceUtf8HeadersPlugin = () => ({
    name: "force-utf8-headers",
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const originalSetHeader = res.setHeader.bind(res);
            res.setHeader = (name, value) => {
                if (typeof name === "string" && name.toLowerCase() === "content-type") {
                    return originalSetHeader(name, normalizeContentType(value));
                }
                return originalSetHeader(name, value);
            };
            const originalWriteHead = res.writeHead.bind(res);
            res.writeHead = (...args) => {
                const current = res.getHeader("Content-Type");
                if (current) {
                    const normalized = normalizeContentType(current);
                    originalSetHeader("Content-Type", normalized);
                }
                return originalWriteHead(...args);
            };
            next();
        });
    },
});

// const sanitizeBase = (value) => {
//     if (!value) return undefined;
//     const trimmed = value.trim();
//     if (!trimmed) return undefined;
//     if (trimmed === ".") return "./";
//     return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
// };

// const resolveBase = () => {
//     return (
//         sanitizeBase(process.env.VITE_BASE) ??
//         sanitizeBase(process.env.BASE) ??
//         sanitizeBase(process.env.BASE_PATH) ??
//         sanitizeBase(process.env.npm_config_base) ??
//         "/"
//     );
// };

// export default defineConfig(() => ({
//     base: resolveBase(),
//     plugins: [forceUtf8HeadersPlugin(), react()],
//     server: {
//         port: 5173,
//         open: false,
//     },
// }));


export default defineConfig({
    base: "/web/", // <-- SET THE CORRECT BASE PATH HERE
    plugins: [
        /* forceUtf8HeadersPlugin() can be removed unless you specifically need it for local dev */
        react()
    ],
    server: {
        port: 5173,
        open: false,
    },
});
