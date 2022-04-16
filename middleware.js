const fs = require("fs");
const { join, resolve, extname } = require("path");
const Engine = require("./engine.js");

/**
 * Built-in middlewares
 */
module.exports = {

  /**
   * Router middleware
   * @param {Router} router
   * @returns
   */
  lookup(router) {
    return async (ctx, next) => {
      const route = router.find(ctx.method, ctx.path);
      if (!route) {
        ctx.throw("Route not found: " + ctx.path, 404);
      }

      ctx.params = route.params;
      ctx.body = await route.handler(ctx);
      if (route.tmpl) {
        ctx.body = ctx.view(route.tmpl, ctx.body);
      }
      await next();
    }
  },

  /**
   * Serve static resources
   * @param {string} root
   * @returns
   */
  static(root) {
    return async (ctx, next) => {
      // Removes the leading slash and converts absolute path to relative path
      root = join(root, "/").replace(/^\/+/, "");
      const path = ctx.path.replace(/^\/+/, "");
      if (!path.startsWith(root)) return await next();

      const file = resolve(path);
      if (!fs.existsSync(file)) {
        ctx.throw("Resource not found: " + ctx.path, 404);
      }
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        ctx.throw("Resource not found: " + ctx.path, 406); // NOT_ACCEPTABLE
      }
      const mime = MIME[extname(file)];
      if (mime) {
        ctx.set("Content-Type", mime);
      }

      // Handling 304 status with negotiation cache
      // : if-modified-since / Last-Modified
      if (stat.mtime) {
        const lastModified = stat.mtime instanceof Date
          ? stat.mtime.toUTCString() : new Date(stat.mtime).toUTCString();

        if (ctx.get("if-modified-since") == lastModified) {
          ctx.status = 304;
        } else {
          ctx.set("Last-Modified", lastModified);
          ctx.body = fs.readFileSync(file);
        }
      } else {
        ctx.body = fs.readFileSync(file);
      }
    }
  },

  /**
   * Template engine middleware
   * @param {object} options
   * @returns
   */
  engine(options) {
    const engine = new Engine(options);
    return async (ctx, next) => {
      ctx.render = engine.render.bind(engine);
      ctx.view = (tmpl, data) => {
        ctx.set("Content-Type", "text/html; charset=utf-8");
        return engine.view(tmpl, data);
      };
      await next();
    }
  }

}

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