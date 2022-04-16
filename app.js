const http = require("http");
const Emitter = require("events");
const Context = require("./context.js");
const Router = require("./router.js");
const middleware = require("./middleware.js");

/**
 * Framework entry inherits from `Emitter.prototype`
 * The core principle and part of source code are derived from koa.js
 * Licensed under the MIT license.
 * @see https://github.com/koajs/koa
 */
module.exports = class extends Emitter {

  #middleware = [];
  #router = new Router();

  constructor() {
    super();

    // Shortcuts for adding routes
    this.all = this.#add("");
    this.get = this.#add("GET");
    this.post = this.#add("POST");
    this.put = this.#add("PUT");
    this.delete = this.#add("DELETE");
    this.head = this.#add("HEAD");
    this.options = this.#add("OPTIONS");
    this.patch = this.#add("PATCH");

    // Use route middleware
    this.use(middleware.lookup(this.#router));
  }

  /**
   * Register the given middleware
   * @param {Function} fn
   * @returns {App}
   */
  use(fn) {
    if (typeof fn !== "function") {
      throw new TypeError("Middleware must be a function");
    }
    this.#middleware.push(fn);
    return this;
  }

  /**
   * Shortcut for using static middleware
   * @param {string} root
   */
  static(root) {
    return this.use(middleware.static(root));
  }

  /**
   * Shortcut for using template engine
   * @param {object} options
   */
  engine(options) {
    return this.use(middleware.engine(options));
  }

  /**
   * Create http server on the specified port
   * @param {number} port
   * @returns {Server}
   */
  listen(port = 3000) {
    const server = http.createServer(this.callback());
    return server.listen(port, () => {
      console.log(`\x1b[90m[Cross] Node version: ${process.version}\x1b[0m`);
      console.log(`\x1b[90m[Cross] Reference: https://github.com/seatwork/node-cross\x1b[0m`);
      console.log(`[Cross] Server is running at \x1b[4m\x1b[36mhttp://localhost:${port}\x1b[0m`);
    });
  }

  /**
   * Return a request handler for node's native http server.
   * @returns {Function}
   */
  callback() {
    const fn = this.#compose(this.#middleware);
    if (!this.listenerCount("error")) {
      this.on("error", this.#onerror); // Set default error handler
    }

    return (req, res) => {
      const ctx = new Context(req, res);
      const onerror = err => this.emit("error", err, ctx);
      const respond = () => ctx.end();
      fn(ctx).catch(onerror).finally(respond);
    }
  }

  /**
   * Compose `middleware` returning a fully valid middleware comprised
   * of all those which are passed.
   * @param {Array} middleware
   * @returns {Function}
   */
  #compose(middleware) {
    /**
     * @param {Context} ctx
     * @returns {Promise}
     */
    return function (ctx, next) {
      // last called middleware
      let index = -1;
      return dispatch(0);
      function dispatch(i) {
        if (i <= index) return Promise.reject(new Error("next() called multiple times"));
        index = i;
        let fn = middleware[i];
        if (i === middleware.length) fn = next;
        if (!fn) return Promise.resolve();
        try {
          return Promise.resolve(fn(ctx, dispatch.bind(null, i + 1)));
        } catch (err) {
          return Promise.reject(err);
        }
      }
    }
  }

  /**
   * Add routes
   * @param {string} method
   * @returns
   */
  #add(method) {
    /**
     * @param {string} path
     * @param {string} tmpl
     * @param {Function} handler
     */
    return (path, tmpl, handler) => {
      if (!handler) {
        handler = tmpl;
        tmpl = null;
      }
      this.#router.add({ method, path, tmpl, handler });
      return this;
    }
  }

  /**
   * Default error handler
   * @param {Error} err
   * @param {Context} ctx
   */
  #onerror(err, ctx) {
    ctx.status = err.status || 500;
    ctx.body = err.message || "Internal Server Error";
    console.error("\x1b[31m[Cross]", err, "\x1b[0m");
  }

}