// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      {
        name: "gemini-api-dev-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === "/api/gemini/status" && req.method === "GET") {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ configured: Boolean(process.env.GEMINI_API_KEY) }));
              return;
            }

            if (req.url === "/api/gemini/chat" && req.method === "POST") {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  const data = JSON.parse(body || "{}");
                  const apiKey = process.env.GEMINI_API_KEY;
                  if (!apiKey) {
                    res.statusCode = 503;
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        error: "GEMINI_API_KEY is not configured in server environment.",
                      }),
                    );
                    return;
                  }

                  const { GoogleGenAI } = await import("@google/genai");
                  const ai = new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                      headers: { "User-Agent": "aistudio-build" },
                    },
                  });

                  const history = Array.isArray(data.history) ? data.history : [];
                  const contents = history.map(
                    (turn: { role: "user" | "model"; text: string }) => ({
                      role: turn.role,
                      parts: [{ text: turn.text }],
                    }),
                  );

                  res.statusCode = 200;
                  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
                  res.setHeader("Cache-Control", "no-cache, no-transform");
                  res.setHeader("Connection", "keep-alive");

                  const responseStream = await ai.models.generateContentStream({
                    model: "gemini-3.8-flash",
                    contents,
                  });

                  for await (const chunk of responseStream) {
                    if (chunk.text) {
                      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
                    }
                  }
                  res.write("data: [DONE]\n\n");
                  res.end();
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "Error calling Gemini API";
                  console.error("Gemini dev server error:", err);
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: message }));
                  } else {
                    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
                    res.end();
                  }
                }
              });
              return;
            }

            next();
          });
        },
      },
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        manifest: false,
        devOptions: { enabled: false },
        workbox: {
          globPatterns: ["**/*.{js,css,woff2,png,svg,ico}"],
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html-navigations", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ url, request }) =>
                url.origin === self.location.origin &&
                ["style", "script", "image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
