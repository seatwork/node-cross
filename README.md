# Node-Cross

Cross is a tiny but complete http server framework without any external dependencies. Its features include:

- [x] Application context
- [x] Middleware like Koa.js
- [x] Built-in static service
- [x] Built-in router service
- [x] Built-in template engine

### Get started

```js
const Cross = require("node-cross");

new Cross()
  .engine({})
  .static("/assets")
  .on("error", (err, ctx) => {})
  .use(ctx => {})
  .get("/", ctx => {})
  .listen();
```

## API Reference

### Methods

- `app.engine(options)` Enable built-in template engine with options `{ strip, root, imports }`.
- `app.static(path)` Serve static resources with the given `path`.
- `app.on("error", function)` Custom unified error handling.
- `app.use(function)` Add a middleware like koa.js.
- `app.get(path, [tmpl,] function)` Add dynamic route including `post`, `put`, `delete` and other
standard request methods, it will auto-render template if `tmpl` exists.
- `app.listen([port])` Create and start an application server on the specified port.
- `app.callback()` Return a request handler for node's native http server.

### Context

#### Properties

- `ctx.params` Get params in route path
- `ctx.query` Get params in query string
- `ctx.method` Get request method
- `ctx.path` Get request path
- `ctx.url` Get request full href
- `ctx.protocol` Get request protocol
- `ctx.host` Get request host
- `ctx.hostname` Get request hostname
- `ctx.origin` Get request origin
- `ctx.headers` Get headers object
- `ctx.cookies` Get cookies object
- `ctx.status` Get response status code
- `ctx.status=` Set response status code
- `ctx.body` Get response body
- `ctx.body=` Set response body

#### Methods

- `ctx.get(name)` Get request headers by name
- `ctx.set(name, value)` Set response headers
- `ctx.cookie(name, value[, options])` Set cookies
- `async ctx.json()` Get request body in json
- `async ctx.text()` Get request body in text
- `async ctx.buffer()` Get request body in buffer
- `ctx.redirect(url[, status])` Redirect url with status default 301
- `ctx.view(path, data)` Render template with a file, only if engine enabled.
- `ctx.render(path, data)` Render template with a text, only if engine enabled.
- `ctx.throw(message, status)` Throw an error with status code

### Route Syntax

- `/static` static route
- `/*` Wildcard route, it will return `wildcard` variable in context.params
- `/:user`
- `/:user?`
- `/:user(\\d+)`

### Template Syntax

- `{{> file }}` Include partial file
- `{{# name }} {{# }}` Define block with name
- `{{## name }}` Use block with name
- `{{ evaluate }}`
- `{{= interpolate }}`
- `{{? conditional }} {{?? }} {{? }}`
- `{{~ iterate:value:index }} {{~ }}`