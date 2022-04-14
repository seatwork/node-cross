const http = require("http");
const fs = require("fs");
const { extname, resolve } = require("path");
const engine = require("./engine.js");
const Context = require("./context.js");

const MIME = {
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".xml": "text/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".ini": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".conf": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "text/jsx; charset=utf-8",
  ".ts": "text/typescript; charset=utf-8",
  ".tsx": "text/tsx; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".tif": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".mp3": "audio/mp3",
  ".mp4a": "audio/mp4",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".aac": "audio/x-aac",
  ".flac": "audio/x-flac",
  ".mp4": "video/mp4",
  ".mp4v": "video/mp4",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".jar": "application/java-archive",
  ".war": "application/java-archive",
  ".gz": "application/gzip",
  ".zip": "application/zip",
};

// HTTP server class
// for handling requests and static resources
module.exports = class Server {
  #app;

  constructor(app) {
    this.#app = app;
  }

  // Create http server on default port 3000
  run(port = 3000) {
    Object.assign(engine.defaults, this.#app.engineOptions);
    const server = http.createServer(this.#dispatch.bind(this));
    server.listen(port, () => {
      console.log(`\x1b[90m[Spark] Node version: ${process.version}\x1b[0m`);
      console.log(`\x1b[90m[Spark] Reference: https://github.com/seatwork/node-spark\x1b[0m`);
      console.log(`[Spark] Server is running at \x1b[4m\x1b[36mhttp://localhost:${port}\x1b[0m`);
    });
  }

  // Handle dynamic requests
  async #dispatch(request, response) {
    const ctx = new Context(request, response);
    // Add template renderer
    ctx.view = (source, data = {}) => {
      ctx.set("Content-Type", "text/html; charset=utf-8");
      return engine(source, data);
    }

    let body = null;
    try {
      const route =
        this.#app.router.find(ctx.method, ctx.path) ||
        this.#app.router.find("ALL", ctx.path);

      if (route) {
        ctx.params = route.params;
        this.#declarePlugins(ctx);

        await this.#executeBefores(ctx);
        body = await route.callback(ctx);
        await this.#executeAfters(ctx);
      } else {
        ctx.throw("Route not found: " + ctx.path, 404);
      }
    } catch (e) {
      ctx.error = e;
      ctx.status = e.status || 500;

      if (this.#app.errorHandler) {
        body = await this.#app.errorHandler(ctx);
      } else {
        body = e.message || "Internal Server Error";
        console.error("\x1b[31m[Spark]", e, "\x1b[0m");
      }
    }
    ctx.send(body);
  }

  // Handle static resource requests
  serve(ctx) {
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
    const lastModified = stat.mtime instanceof Date
      ? stat.mtime.toUTCString()
      : new Date(stat.mtime).toUTCString();

    if (ctx.get("if-modified-since") == lastModified) {
      ctx.status = 304;
    } else {
      ctx.set("Last-Modified", lastModified);
      return fs.readFileSync(file);
    }
  }

  // Declare plugins to ctx
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

  // Execute before middlewares
  async #executeBefores(ctx) {
    const befores = this.#app.befores;
    for (const middleware of befores) {
      await middleware(ctx);
    }
  }

  // Execute after middlewares
  async #executeAfters(ctx) {
    const afters = this.#app.afters;
    for (const middleware of afters) {
      await middleware(ctx);
    }
  }

}