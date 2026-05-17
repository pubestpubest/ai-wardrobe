import { resolve } from "node:path";

const { default: tsrServer } = await import("./dist/server/server.js");
const CLIENT = resolve(import.meta.dir, "dist/client");

export default {
  async fetch(req: Request) {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith("/assets/")) {
      const filePath = resolve(CLIENT, pathname.slice(1));
      if (filePath.startsWith(CLIENT)) {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file, {
            headers: { "cache-control": "public, max-age=31536000, immutable" },
          });
        }
      }
    }

    return tsrServer.fetch(req);
  },
};
