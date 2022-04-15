# Node-Cross

A tiny but complete http server framework without any external dependencies.

### Get started

```js
const Cross = require("node-cross");

new Cross()
  .serve("/assets/*")
  .template({})
  .define("db", {})
  .before(ctx => {})
  .after(ctx => {})
  .error(ctx => {})
  .get("/", ctx => {})
  .listen();
```

## API Reference

### Methods

- `app.serve(path)` Serve static resources
- `app.template(options)` Set template options `{ strip, root, imports }`
- `app.define(name, obj)` Define a plugin to context instance
- `app.before(function)` Define a middleware before route executed
- `app.after(function)` Define a middleware after route executed
- `app.all(path[, tmpl], handle)`
- `app.get(path[, tmpl], handle)`
- `app.post(path[, tmpl], handle)`
- ...

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
- `ctx.request` The native request object
- `ctx.response` The native response object

#### Methods

- `ctx.get(name)` Get request headers by name
- `ctx.set(name, value)` Set response headers
- `ctx.cookie(name, value[, options])` Set cookies
- `async ctx.json()` Get request body in json
- `async ctx.text()` Get request body in text
- `async ctx.buffer()` Get request body in buffer
- `ctx.send(body[, status])` Send response to client with status default 200
- `ctx.redirect(url[, status])` Redirect url with status default 301
- `ctx.view(path, data)` Render template with a file
- `ctx.throw(message, status)` Throw an error with status code

### Template Syntax

- `{{> file }}` Include partial file
- `{{# name }} {{# }}` Define block with name
- `{{## name }}` Use block with name
- `{{ evaluate }}`
- `{{= interpolate }}`
- `{{? conditional }} {{?? }} {{? }}`
- `{{~ iterate:value:index }} {{~ }}`