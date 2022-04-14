const Router = require("./router.js");
const Server = require("./server.js");

// Spark framework entry
// to setup runtime container
module.exports = class Spark {

  #engineOptions;
  #plugins = {};
  #befores = [];
  #afters = [];
  #router = new Router();
  #server = new Server(this);

  get engineOptions() { return this.#engineOptions; }
  get plugins() { return this.#plugins; }
  get befores() { return this.#befores; }
  get afters() { return this.#afters; }
  get router() { return this.#router; }
  get dispatch() { return this.#server.dispatch; }

  // Run server on the specified port
  listen(port) {
    this.#server.run(port);
    return this;
  }

  // Declare plugins
  declare(name, dest) {
    if (this.#plugins[name]) {
      throw new Error(`The plugin name "${name}" has been declared`);
    }
    this.#plugins[name] = dest;
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

  // Add static resources handler
  serve(path) {
    this.#router.add({
      method: "GET", path,
      callback: this.#server.serve
    });
    return this;
  }

  // Set engine options
  engine(options) {
    this.#engineOptions = options;
  }

  // Add route for request methods
  all(path, fn) {
    return this.#request("ALL")(path, fn);
  }

  get(path, fn) {
    return this.#request("GET")(path, fn);
  }

  post(path, fn) {
    return this.#request("POST")(path, fn);
  }

  put(path, fn) {
    return this.#request("PUT")(path, fn);
  }

  delete(path, fn) {
    return this.#request("DELETE")(path, fn);
  }

  patch(path, fn) {
    return this.#request("PATCH")(path, fn);
  }

  head(path, fn) {
    return this.#request("HEAD")(path, fn);
  }

  options(path, fn) {
    return this.#request("OPTIONS")(path, fn);
  }

  #request(method) {
    return (path, callback) => {
      this.#router.add({ method, path, callback });
      return this;
    }
  }

}