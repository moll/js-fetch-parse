FetchParse.js
=============
[![NPM version][npm-badge]](https://www.npmjs.com/package/fetch-parse)
[![Build status][travis-badge]](https://travis-ci.org/moll/js-fetch-parse)

FetchParse.js is a mixin for the [Fetch API][fetch] for browsers and Node.js that **automatically buffers response bodies** and assigns them as `body` on the response object (saving you from extra `res.text()` or `res.json()` calls). It can also **optionally parse response bodies** based on the `Content-Type` header (using [MediumType.js][medium-type] for media types).

[npm-badge]: https://img.shields.io/npm/v/fetch-parse.svg
[travis-badge]: https://travis-ci.org/moll/js-fetch-parse.png?branch=master
[fetch]: https://developer.mozilla.org/en/docs/Web/API/Fetch_API
[medium-type]: https://github.com/moll/js-medium-type


Installing
----------
```sh
npm install fetch-parse
```

FetchParse.js follows [semantic versioning](http://semver.org), so feel free to depend on its major version with something like `>= 1.0.0 < 2` (a.k.a `^1.0.0`).


Using
-----
Pass the native `fetch` function to `fetchParse` to get back a new `fetch` function that will buffer all responses and assign the buffered response body to the `body` property on the response object. It'll also parse JSON responses (those whose `Content-Type` matches `application/json` or `*/*+json`):

```javascript
var fetchParse = require("fetch-parse")
var apiFetch = fetchParse(fetch)
```

The above is equal to calling `fetchParse` with the wildcard media type:

```javascript
var fetchParse = require("fetch-parse")
var apiFetch = fetchParse(fetch, {"*/*": true})
```

Now, calling `apiFetch` will give you back a promise with a regular `Response` object, but with the `body` property assigned to the buffered response body:

```javascript
apiFetch("/users").then(function(res) {
  // If Content-Type of /users was application/json and it returned
  // an array, you could start using it right there:
  res.body[0].email
})
```

For built-in parsers that FetchParse.json includes, see below.

### Parsers
To configure what media types FetchParse.js buffers and parses, pass an object of media type patterns and `true`s. The `true` value there indicates you'd like to use the default parser. If you need a custom parser, see [Custom Parsers](#custom-parsers).

```javascript
var fetchParse = require("fetch-parse")

var apiFetch = fetchParse(fetch, {
  "text/markdown": true,
  "json": true,
})
```

FetchParse.js uses [MediumType.js][medium-type]'s [`MediumType.prototype.match`](https://github.com/moll/js-medium-type/blob/master/doc/API.md#MediumType.prototype.match) to match the parser pattern against the response's `Content-Type` header. The buffering and parsing behavior is dependent on `Content-Type` because that allows enabling default parsing of every response with `{"*/*": true}`, but still get `text/plain` parsed as a string, `application/json` as a JavaScript object etc.

#### Default Parsers

`Content-Type`     | Description
-------------------|------------
`text/*`           | Calls `res.text()` and returns a string.
`application/json` | Equivalent to `res.json()` and returns a parsed object.
`*/*+json`         | _See `application/json` above._
`application/xml`  | Calls `res.text()` and returns a string.
`*/*+xml`          | _See `application/xml` above._
`*/*`              | Calls `res.arrayBuffer()` and returns an `ArrayBuffer`.

#### Shorthands
Aside from regular media type patterns, FetchParse.js has two shorthands for JSON and XML. That's because [RFC 6839][rfc6839] specifies standardized suffices for those two in addition to `application/json` and `application/xml`. Using `json` for example saves you from having to specify both patterns explicitly.

Shorthand | Types
----------|------
`json`    | `application/json`, `*/*+json`
`xml`     | `application/xml`, `*/*+xml`

[rfc6839]: https://tools.ietf.org/html/rfc6839

### Custom Parsers
To use a custom parser for some media types, pass an object mapping a media type pattern to that parse function. The parse function must take a `Fetch.Request` object and return a promise of a body. FetchParse.js will itself assign that to the `body` property on the response object.

```javascript
var fetchParse = require("fetch-parse")

var apiFetch = fetchParse(fetch, {
  "text/html": parseHtml,
  "image/*": parseImage,
  "application/vnd.example.model+json": parseModel
})
```

You can implement `parseHtml` by first calling `Response.prototype.text` to get the plain-text version and then creating a `DocumentFragment` from it:

```javascript
function parseHtml(res) {
  return res.text().then(function(html) {
    return document.createRange().createContextualFragment(html)
  })
}
```

For converting bytes of an image to a URL you could later use with `<img src="" />`, you could call `Response.prototype.arrayBuffer` and create a Blob URL from it (e.g. `blob:d3958f5c-0777-0845-9dcf-2cb28783acaf`):

```javascript
function parseImage(res) {
  return res.arrayBuffer().then(function(body) {
    var blob = new Blob([body], {type: res.headers.get("content-type")})
    return URL.createObjectURL(blob)
  })
}
```

To parse JSON into a your own model instance, you can first use `Response.prototype.json` to have it parsed into an object and then instantiate your model with it:

```javascript
function Model(attrs) { this.attributes = attrs }

function parseModel(res) {
  return res.json().then(function(attrs) { return new Model(attrs) })
}
```

### Browser
Browsers have the Fetch API available at `window.fetch`:

```javascript
var fetchParse = require("fetch-parse")
var apiFetch = fetchParse(window.fetch)
```

### Node.js
Node.js doesn't have a built-in implementation of the Fetch API, but you can use any library with a compatible interface, such as my [Fetch/Off.js][fetch-off] or [node-fetch][node-fetch]:

[fetch-off]: https://github.com/moll/node-fetch-off
[node-fetch]: https://github.com/bitinn/node-fetch

```javascript
var fetch = require("fetch-off")
var fetchParse = require("fetch-parse")
var apiFetch = fetchParse(fetch, "https://example.com")
```


License
-------
FetchParse.js is released under a *Lesser GNU Affero General Public License*, which in summary means:

- You **can** use this program for **no cost**.
- You **can** use this program for **both personal and commercial reasons**.
- You **do not have to share your own program's code** which uses this program.
- You **have to share modifications** (e.g. bug-fixes) you've made to this program.

For more convoluted language, see the `LICENSE` file.


About
-----
**[Andri Möll][moll]** typed this and the code.  
[Monday Calendar][monday] supported the engineering work.

If you find FetchParse.js needs improving, please don't hesitate to type to me now at [andri@dot.ee][email] or [create an issue online][issues].

[email]: mailto:andri@dot.ee
[issues]: https://github.com/moll/js-fetch-parse/issues
[moll]: http://themoll.com
[monday]: https://mondayapp.com
