import { Router } from "./router.js";
import { Server } from "./server.js";

// Spark framework entry
export class Spark {

  #plugins = {};
  #befores = [];
  #afters = [];
  #router = new Router();
  #server = new Server(this);

  get plugins() { return this.#plugins; }
  get befores() { return this.#befores; }
  get afters() { return this.#afters; }
  get router() { return this.#router; }

  // Run the server on the specified port
  listen(port) {
    this.#server.run(port);
    return this;
  }

  // Declare plugins
  plugin(name, dest) {
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
  static(path) {
    this.#router.add({
      method: "GET", path,
      callback: this.#server.handleStatic
    });
    return this;
  }

  // Add route for all methods
  all(path, callback) {
    return this.#request("ALL")(path, callback);
  }

  get(path, callback) {
    return this.#request("GET")(path, callback);
  }

  post(path, callback) {
    return this.#request("POST")(path, callback);
  }

  put(path, callback) {
    return this.#request("PUT")(path, callback);
  }

  delete(path, callback) {
    return this.#request("DELETE")(path, callback);
  }

  patch(path, callback) {
    return this.#request("PATCH")(path, callback);
  }

  head(path, callback) {
    return this.#request("HEAD")(path, callback);
  }

  options(path, callback) {
    return this.#request("OPTIONS")(path, callback);
  }

  #request(method) {
    return (path, callback) => {
      this.#router.add({ method, path, callback });
      return this;
    }
  }

}