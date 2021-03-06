## 1.1.0 (Nov 20, 2016)
- Adds `text/xml` to the list of XML content-types.

## 1.0.0 (Nov 16, 2016)
- Renames to FetchParse.js.
- Adds support for passing in an object of types and parsers.  
  For a parsers pass either a function taking a `Response` object and returning a `Promise` with the body or `true` to use the default parser for that type.
- Removes support for passing in an array of types to use default parsers.
- Adds XML support.

## 0.3.0 (Jul 31, 2016)
- Sets `body` to what `arrayBuffer` returns when type not text or JSON.

## 0.2.1 (Jan 2, 2016)
- Assigns the `body` property with `Object.defineProperty` to work on Fetch
  implementations that already have `body` as a getter.

## 0.2.0 (Dec 17, 2015)
- Skips parsing again if body already used (`res.bodyUsed`).  
  This also means `body` _won't be_ set `undefined` in cases where the
  Content-Type is not recognized.
- Allows passing in an array of media types to be read and possibly parsed.  
  Only JSON is actually parsed. The rest are read to `res.body`.
- Reads `text/javascript` as regular text, not JSON.
- Skips parsing JSON if no actual content is returned (such as in response to
  a `HEAD`) and sets `body` to `undefined`.
- Sets the `body` of a response (assigned to `err.response`) to the invalid JSON
  should an error occur.

## 0.1.338 (Dec 11, 2015)
- Skips parsing when response 304 Not Modified.  
  This fixes fetching from servers that send a Content-Type along with 304.
- Skips parsing when response 204 No Content.  
  A fail-safe similar to the above.
- Sets a non-enumerable `response` property containing the request's `Response`
  on the `SyntaxError` should JSON parsing fail.

## 0.1.337 (Dec 11, 2015)
- Scoped release for personal use and profit.
