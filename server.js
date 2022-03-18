import fs from "fs";
import Http from "http";
import { extname, resolve } from "path";
import { Context } from "./context.js";

const MIME = {
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".tif": "image/tiff",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".zip": "application/zip",
};

// HTTP server class
export class Server {
  #app;

  constructor(app) {
    this.#app = app;
  }

  // Create http server
  run(port = 3000) {
    const server = Http.createServer(this.#handleRequest.bind(this));
    server.listen(port, () => {
      console.log(`\x1b[90m[Spark] Node version: ${process.version}\x1b[0m`);
      console.log(`\x1b[90m[Spark] Reference: https://github.com/seatwork/node-spark\x1b[0m`);
      console.log(`[Spark] Server is running at \x1b[4m\x1b[36mhttp://localhost:${port}\x1b[0m`);
    });
  }

  // Handle dynamic requests
  async #handleRequest(request, response) {
    const ctx = new Context(request, response);
    try {
      const route =
        this.#app.router.find(ctx.method, ctx.path) ||
        this.#app.router.find("ALL", ctx.path);

      if (route) {
        ctx.params = route.params;
        this.#declarePlugins(ctx);

        await this.#executeBefores(ctx);
        ctx.body = await route.callback(ctx);
        await this.#executeAfters(ctx);
        ctx.send(ctx.body);
      } else {
        ctx.throw("Route not found: " + ctx.path, 404);
      }
    } catch (e) {
      console.error("\x1b[31m[Spark]", e, "\x1b[0m");
      ctx.send(e.message, e.status || 500);
    }
  }

  // Handle static resource requests
  handleStatic(ctx) {
    // Removes the leading slash and converts relative path to absolute path
    const file = resolve(ctx.path.replace(/^\/+/, ""));
    if (!fs.existsSync(file)) {
      ctx.throw("Resource not found: " + ctx.path, 404);
      return;
    }
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      ctx.throw("Resource not found: " + ctx.path, 406); // NOT_ACCEPTABLE
      return;
    }
    const mime = MIME[extname(file)];
    if (mime) {
      ctx.set("Content-Type", mime);
    }
    if (!stat.mtime) {
      return fs.readFileSync(file);
    }

    // Handling 304 status with negotiation cache
    // : if-modified-since / Last-Modified
    const lastModified = stat.mtime.toUTCString();
    if (ctx.get("if-modified-since") == lastModified) {
      ctx.status = 304;
    } else {
      ctx.set("Last-Modified", lastModified);
      return fs.readFileSync(file);
    }
  }

  #declarePlugins(ctx) {
    const plugins = this.#app.plugins;
    Object.keys(plugins).forEach(name => {
      if (ctx[name]) {
        ctx.throw(`The plugin name "${name}" is reserved`);
        return;
      }
      ctx[name] = plugins[name];
    })
  }

  async #executeBefores(ctx) {
    const befores = this.#app.befores;
    for (const middleware of befores) {
      await middleware(ctx);
    }
  }

  async #executeAfters(ctx) {
    const afters = this.#app.afters;
    for (const middleware of afters) {
      await middleware(ctx);
    }
  }

}