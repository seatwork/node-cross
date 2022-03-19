/**
 * Router object for adding and finding routes
 * based on radix tree.
 */
module.exports = class Router {

  // In view of the fact that x/router does not implement the
  // parsing function of the request method, this framework
  // adds the grouping of routers according to request method
  #radixGroup = {};

  /**
   * Add a route
   * @param route Route
   */
  add(route) {
    let radix = this.#radixGroup[route.method];
    if (!radix) {
      radix = new Radix();
      this.#radixGroup[route.method] = radix;
    }
    radix.add(route.path, route.callback);
  }

  /**
   * Find a route
   * @param method
   * @param path
   * @returns Route
   */
  find(method, path) {
    const radix = this.#radixGroup[method];
    if (radix) {
      const [callback, params] = radix.find(path);
      if (callback) {
        const p = {};
        for (const [k, v] of params) p[k] = v;
        return { method, path, callback, params: p };
      }
    }
  }

}

/**
 * Radix tree modified version (Modify the return parameters type)
 * @author https://github.com/zhmushan/router
 * @import https://deno.land/x/router@v2.0.1/mod.ts
 */
class Radix {

  path = "";
  children = new Map();
  handler;

  constructor(node) {
    if (node) Object.assign(this, node);
  }

  add(path, handler) {
    let n = this;
    let i = 0;
    for (; i < path.length && !isWildcard(path[i]); ++i);
    n = n.#merge(path.slice(0, i));

    let j = i;
    for (; i < path.length; ++i) {
      if (isWildcard(path[i])) {
        if (j !== i) {
          // insert static route
          n = n.#insert(path.slice(j, i));
          j = i;
        }

        ++i;

        for (; i < path.length && path[i] !== "/"; ++i) {
          if (isWildcard(path[i])) {
            throw new Error(
              `only one wildcard per path segment is allowed, has: "${path.slice(
                j, i)}" in path "${path}"`,
            );
          }
        }

        if (path[j] === ":" && i - j === 1) {
          throw new Error(
            `param must be named with a non-empty name in path "${path}"`,
          );
        }

        // insert wildcard route
        n = n.#insert(path.slice(j, i));
        j = i;
      }
    }

    if (j === path.length) {
      n.#merge("", handler);
    } else {
      n.#insert(path.slice(j), handler);
    }
  }

  find(path) {
    let handler;
    const params = new Map();
    const stack = [[this, path, false]];

    for (let i = 0; i >= 0;) {
      const [n, p, v] = stack[i];
      let np; // next path

      if (v) {
        --i;
        if (n.path[0] === ":") { // assert not "*"
          params.delete(n.path.slice(1));
        }
        continue;
      } else {
        stack[i][2] = true; // vis = true
      }

      if (n.path[0] === "*") {
        if (n.path.length > 1) {
          params.set(n.path.slice(1), p);
        }
        np = undefined;
      } else if (n.path[0] === ":") {
        const [_cp, _np] = splitFromFirstSlash(p);
        params.set(n.path.slice(1), _cp);
        np = _np === "" ? undefined : _np;
      } else if (n.path === p) {
        if (n.handler === undefined) {
          if (n.children.has("*")) {
            np = "";
          } else {
            --i;
            continue;
          }
        } else {
          np = undefined;
        }
      } else {
        const lcp = longestCommonPrefix(n.path, p);
        if (lcp !== n.path.length) {
          --i;
          continue;
        } else {
          np = p.slice(lcp);
        }
      }

      if (np === undefined) {
        handler = n.handler;
        break;
      }

      let c = n.children.get("*");
      if (c) {
        stack[++i] = [c, np, false];
      }

      if (np === "") {
        continue;
      }

      c = n.children.get(":");
      if (c) {
        stack[++i] = [c, np, false];
      }

      c = n.children.get(np[0]);
      if (c) {
        stack[++i] = [c, np, false];
      }
    }

    return [handler, params];
  }

  #merge = (path, handler) => {
    let n = this;

    if (n.path === "" && n.children.size === 0) {
      n.path = path;
      n.handler = handler;
      return n;
    }

    if (path === "") {
      if (n.handler) {
        throw new Error(
          `a handler is already registered for path "${n.path}"`,
        );
      }
      n.handler = handler;
      return n;
    }

    for (; ;) {
      const i = longestCommonPrefix(path, n.path);

      if (i < n.path.length) {
        const c = new Radix({
          path: n.path.slice(i),
          children: n.children,
          handler: n.handler,
        });

        n.children = new Map([[c.path[0], c]]);
        n.path = path.slice(0, i);
        n.handler = undefined;
      }

      if (i < path.length) {
        path = path.slice(i);
        let c = n.children.get(path[0]);

        if (c) {
          n = c;
          continue;
        }

        c = new Radix({ path, handler });
        n.children.set(path[0], c);
        n = c;
      } else if (handler) {
        if (n.handler) {
          throw new Error(
            `a handler is already registered for path "${path}"`,
          );
        }
        n.handler = handler;
      }
      break;
    }
    return n;
  };

  #insert = (path, handler) => {
    let n = this;
    let c = n.children.get(path[0]);

    if (c) {
      n = c.#merge(path, handler);
    } else {
      c = new Radix({ path, handler });
      n.children.set(path[0], c);
      n = c;
    }
    return n;
  };
}

function isWildcard(c) {
  if (c.length !== 1) throw new Error("Wildcard parse error");
  return c === ":" || c === "*";
}

function longestCommonPrefix(a, b) {
  let i = 0;
  const len = Math.min(a.length, b.length);
  for (; i < len && a[i] === b[i]; ++i);
  return i;
}

function splitFromFirstSlash(path) {
  let i = 0;
  for (; i < path.length && path[i] !== "/"; ++i);
  return [path.slice(0, i), path.slice(i)];
}