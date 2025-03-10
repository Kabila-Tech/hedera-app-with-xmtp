import { defineConfig } from "vite";
import { Buffer } from "buffer";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@xmtp/browser-sdk"],
    include: ["@xmtp/proto"],
  },
  define: {
    global: {
      Buffer: Buffer,
    },
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
