const { Stream } = require("stream");

/**
 * Context of application
 * extends request and response
 */
module.exports = class Context {

  #request;
  #response;
  #url;
  #status;

  #params = {};
  #query = {};

  constructor(request, response) {
    this.#request = request;
    this.#response = response;

    this.#url = new URL(this.url);
    for (const [k, v] of this.#url.searchParams) {
      this.#query[k] = v;
    }
  }

  // Get native request object
  get request() {
    return this.#request;
  }

  // Get native response object
  get response() {
    return this.#response;
  }

  // Get request method
  get method() {
    return this.#request.method;
  }

  // Get request protocol
  get protocol() {
    return this.#getProtocol(this.#request);
  }

  // Get host in request headers
  get host() {
    return this.#request.headers.host;
  }

  // Get request full href
  get url() {
    return this.protocol + "://" + this.host + decodeURI(this.#request.url);
  }

  // Get request path
  get path() {
    return decodeURI(this.#url.pathname);
  }

  // Get request origin
  get origin() {
    return this.#url.origin;
  }

  // Get request hostname
  get hostname() {
    return this.#url.hostname;
  }

  // Set params in route path
  set params(p) {
    Object.assign(this.#params, p);
  }

  // Get params in route path
  get params() {
    return this.#params;
  }

  // Get params in query string
  get query() {
    return this.#query;
  }

  // Get all request headers
  get headers() {
    return this.#request.headers;
  }

  // Get all cookies
  get cookies() {
    const cookies = {};
    let cookie = this.get("cookie");
    if (cookie) {
      cookie.split(/;\s+/).forEach(c => {
        const i = c.indexOf("=");
        const k = c.substring(0, i);
        const v = c.substring(i + 1);
        cookies[k] = v;
      })
    }
    return cookies;
  }

  // Set response status code
  set status(status) {
    this.#status = status;
  }

  // Get response status code
  get status() {
    const s = parseInt(this.#status);
    return (isNaN(s) || s < 200 || s > 511) ? 200 : s;
  }

  // Set cookie (set value with null to delete cookie)
  cookie(name, value, options = {}) {
    const cookies = [`${name}=${value}`];
    if (value === null) {
      options.maxAge = 0;
    }
    if (options.domain) {
      cookies.push(`domain=${options.domain}`);
    }
    if (options.maxAge !== undefined) {
      cookies.push(`max-age=${options.maxAge}`);
    }
    if (options.httpOnly) {
      cookies.push(`httpOnly=true`);
    }
    this.set("Set-Cookie", cookies.join("; "));
  }

  // Get request headers by name
  get(name) {
    return this.headers[name];
  }

  // Set response headers
  set(name, value) {
    this.#response.setHeader(name, value);
  }

  // Get request body in json
  async json() {
    return await this.#rawbody("json");
  }

  // Get request body in text
  async text() {
    return await this.#rawbody("text");
  }

  // Get request body in buffer
  async buffer() {
    return await this.#rawbody("buffer");
  }

  // Send response to client
  send(body, status) {
    if (this.#response.headersSent) return;
    status = status || this.status;
    this.#response.statusCode = status;

    if (body === undefined || body === null || status === 204 || status === 304) {
      return this.#response.end();
    }
    if (body instanceof Stream) {
      return body.pipe(this.#response);
    }
    if (typeof body === "string" || Buffer.isBuffer(body)) {
      return this.#response.end(body);
    }
    this.set("Content-Type", "application/json; charset=utf-8");
    this.#response.end(JSON.stringify(body));
  }

  // Permanent redirect codes: 301 (default), 308
  // Temporary redirect codes: 302，303，307
  redirect(url, status = 301) {
    this.#response.writeHead(status, { Location: url });
    this.#response.end();
  }

  // Throw an error with status code
  throw(message, status) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }

  // Get request protocol
  #getProtocol(req) {
    let proto = req.connection.encrypted ? "https" : "http";
    proto = req.headers["x-forwarded-proto"] || proto; // only do this if you trust the proxy
    return proto.split(",")[0];
  }

  // Parse raw body
  #rawbody(type) {
    return new Promise((resolve, reject) => {
      const buffer = [];
      this.#request.on("data", chunk => buffer.push(chunk));
      this.#request.on("error", err => reject(err));
      this.#request.on("end", () => {
        if (type === "buffer") {
          return resolve(buffer);
        }
        let body = Buffer.concat(buffer).toString("utf8");
        body = type === "json" ? JSON.parse(body) : body;
        resolve(body);
      });
    });
  }

}