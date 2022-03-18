# Micro-spark

Small but complete http server framework without any external dependencies.

### Get started

```js
import { Spark } from "../app.js";

new Spark()
  .static("/assets/*")
  .plugin("db", {
    // register a plugin to "ctx"
    query: (user) => {}
  })
  .before(ctx => {
    // dosomething before route executed
  })
  .after(ctx => {
    // dosomething after route executed
  })
  .get("/:name", ctx => {
    return ctx.params.name;
  })
  .get("/tmpl", ctx => {
    return ctx.render("<div>hello, {{= name}}</div>", { name: "world" });
  })
  .get("/tmplfile", ctx => {
    return ctx.view("tmpl.html", { name: "world" });
  })
  .listen();
```

## API Reference

### Constructor

- `app.plugin(name, dest)`
- `app.static(path)`
- `app.before(function)`
- `app.after(function)`
- `app.all(path, handle)`
- `app.get(path, handle)`
- `app.post(path, handle)`
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
- `ctx.headers` Get headers object
- `ctx.cookies` Get cookies object
- `ctx.status` Get response status code
- `ctx.request` The native request object
- `ctx.response` The native response object

#### Methods

- `ctx.status(code)` Set response status code
- `ctx.get(name)` Get request headers by name
- `ctx.set(name, value)` Set response headers
- `async ctx.json()` Get request body in json
- `async ctx.text()` Get request body in text
- `async ctx.buffer()` Get request body in buffer
- `ctx.send(body, status)` Send response to client
- `ctx.redirect(url[, status])` Redirect url with status default 301
- `ctx.view(path, data)` Render template with a file
- `ctx.render(tmpl, data = {})` Render template with plaintext
- `ctx.throw(message, status)` Throw an error with status code

### Template Engine

See https://github.com/olado/doT