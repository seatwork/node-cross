/**
 * Router
 * @example /static
 * @example /:user
 * @example /:user?
 * @example /:user(\\d+)
 * @example /*
 */
module.exports = class Router {
  #routes = [];

  /**
   * Add a route
   * @param {string} method
   * @param {string|RegExp} path
   * @param {Function} handler
   */
  add(route) {
    route.pattern = this.#parse(route.path);
    this.#routes.push(route);
  }

  /**
   * Find a route
   * @param {string} method
   * @param {string} url
   * @returns
   */
  find(method, url) {
    for (const route of this.#routes) {
      if (route.method && route.method !== method) continue;

      const matches = route.pattern.exec(url);
      if (matches) {
        const g = matches.groups; route.params = {};
        if (g) for (const k in g) route.params[k] = g[k];
        return route;
      }
    }
  }

  /**
   * Parse route pattern to regex
   * @param {string|RegExp} pattern
   * @returns
   */
  #parse(pattern) {
    return pattern instanceof RegExp ? pattern : new RegExp(
      "^" + pattern
        .replace(/\/\*($|\/)/g, "/(?<wildcard>.*)$1")
        .replace(/:(\w+)(\(\S+\))?/g, (_, k, r) => `(?<${k}>${r ? r : "([^/]+?)"})`)
      + "$");
  }

}