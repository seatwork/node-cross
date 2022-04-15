const Router = require("./router.js");
const Engine = require("./engine.js");
const Server = require("./server.js");

/**
 * Http server framework entry
 * to setup runtime container
 */
module.exports = class {

  #plugins = {};
  #befores = [];
  #afters = [];
  #errorRoute;

  #router = new Router();
  #engine = new Engine();
  #server = new Server(this);

  constructor() {
    this.all = this.#add("");
    this.get = this.#add("GET");
    this.post = this.#add("POST");
    this.put = this.#add("PUT");
    this.delete = this.#add("DELETE");
    this.patch = this.#add("PATCH");
    this.head = this.#add("HEAD");
    this.options = this.#add("OPTIONS");
  }

  get plugins() { return this.#plugins; }
  get befores() { return this.#befores; }
  get afters() { return this.#afters; }
  get router() { return this.#router; }
  get engine() { return this.#engine; }
  get errorRoute() { return this.#errorRoute; }
  get dispatch() { return this.#server.dispatch; }

  // Run server on the specified port
  listen(port) {
    this.#server.run(port);
    return this;
  }

  // Define plugins
  define(name, object) {
    if (this.#plugins[name]) {
      throw new Error(`The plugin name "${name}" has been defined`);
    }
    this.#plugins[name] = object;
    return this;
  }

  // Add middleware before route
  before(fn) {
    this.#befores.push(fn);
    return this;
  }

  // Add middleware after route
  after(fn) {
    this.#afters.push(fn);
    return this;
  }

  // Serve static resources
  serve(path) {
    this.#router.add({ method: "GET", path, handler: this.#server.serve });
    return this;
  }

  // Set engine options
  template(options) {
    this.#engine.default(options);
    return this;
  }

  // Set error handler
  error(tmpl, handler) {
    if (!handler) {
      handler = tmpl;
      tmpl = null;
    }
    this.#errorRoute = { tmpl, handler };
    return this;
  }

  // Add routes
  #add(method) {
    return (path, tmpl, handler) => {
      if (!handler) {
        handler = tmpl;
        tmpl = null;
      }
      this.#router.add({ method, path, tmpl, handler });
      return this;
    }
  }

}