import fs from "fs";
import { resolve } from "path";
import { Stream } from "stream";
import { template } from "./engine.js";

// Context of application
// extends request and response
export class Context {

  #request;
  #response;
  #url;

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

  get request() {
    return this.#request;
  }

  get response() {
    return this.#response;
  }

  // Get request method
  get method() {
    return this.#request.method;
  }

  // Get request full href
  get url() {
    return this.protocol + "://" + this.host + this.#request.url;
  }

  // Get request path
  get path() {
    return this.#url.pathname;
  }

  // Get request protocol
  get protocol() {
    return this.#getProtocol(this.#request);
  }

  // Get host in request headers
  get host() {
    return this.#request.headers.host;
  }

  // Get params in route path
  get params() {
    return this.#params;
  }

  // Get params in query string
  get query() {
    return this.#query;
  }

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

  // Get response status code
  get status() {
    return this.#response.statusCode;
  }

  // Is headers sent?
  get sent() {
    return this.#response.headersSent;
  }

  // Set cookie (set value with null to delete cookie)
  cookie(name, value, options = {}) {
    const cookies = [`${name}=${value}`];
    if (options.domain) {
      cookies.push(`domain=${options.domain}`);
    }
    if (options.maxAge) {
      cookies.push(`max-age=${options.maxAge}`);
    }
    if (options.httpOnly) {
      cookies.push(`httpOnly=true`);
    }
    this.set("Set-Cookie", cookies.join("; "));
  }

  // Set params in route path
  params(p) {
    Object.assign(this.#params, p);
  }

  // Set response status code
  status(s) {
    this.#response.statusCode = (!s || s < 200 || s > 511) ? 200 : s;
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
    if (!this.status) this.status(status);
    if (this.sent) return;

    if (body === undefined || body === null) {
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
    this.response.writeHead(status, { Location: url });
    this.response.end();
  }

  // Render template with a file
  view(path, data = {}) {
    path = resolve(path.replace(/^\/+/, ""));
    const tmpl = fs.readFileSync(path);
    this.set("Content-Type", "text/html; charset=utf-8");
    return this.render(tmpl, data);
  }

  // Render template with plaintext
  render(tmpl, data = {}) {
    // ignores the default argName "it"
    const fn = template(tmpl, { argName: Object.keys(data) });
    return fn(data);
  }

  // Throw an error with status code
  throw(message, status) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }

  #getProtocol(req) {
    let proto = req.connection.encrypted ? "https" : "http";
    proto = req.headers["x-forwarded-proto"] || proto; // only do this if you trust the proxy
    return proto.split(",")[0];
  }

  #rawbody(type) {
    return new Promise((resolve, reject) => {
      const buffer = [];
      this.#request.on("data", chunk => {
        buffer.push(chunk);
      });
      this.#request.on("error", err => {
        reject(err);
      });
      this.#request.on("end", () => {
        if (type === "buffer") {
          resolve(buffer);
        } else {
          const body = Buffer.concat(buffer).toString("utf8");
          if (type === "json") {
            resolve(JSON.parse(body));
          } else {
            resolve(body);
          }
        }
      });
    });
  }

}