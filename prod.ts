import { resolve } from "node:path";

const { default: tsrServer } = await import("./dist/server/server.js");
const CLIENT = resolve(import.meta.dir, "dist/client");

export default {
  async fetch(req: Request) {
    const { pathname } = new URL(req.url);

    // Everything Vite emitted into dist/client is served straight off disk: the
    // hashed /assets/* bundle plus everything copied from public/ (the poster
    // page, mock model PNGs). Misses fall through to SSR, so app routes are
    // unaffected — dist/client has no index.html of its own.
    const rel = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const filePath = resolve(CLIENT, rel.slice(1));
    if (filePath.startsWith(CLIENT)) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "cache-control": pathname.startsWith("/assets/")
              ? "public, max-age=31536000, immutable"
              : "public, max-age=300",
          },
        });
      }
    }

    return tsrServer.fetch(req);
  },
};
