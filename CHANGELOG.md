## Unreleased
- Skips parsing again if body already used (`res.bodyUsed`).  
  This also means `body` _won't be_ set `undefined` in cases where the
  Content-Type is not recognized.

## 0.1.338 (Dec 11, 2015)
- Skips parsing when response 304 Not Modified.  
  This fixes fetching from servers that send a Content-Type along with 304.
- Skips parsing when response 204 No Content.  
  A fail-safe similar to the above.
- Sets a non-enumerable `response` property containing the request's `Response`
  on the `SyntaxError` should JSON parsing fail.

## 0.1.337 (Dec 11, 2015)
- Scoped release for personal use and profit.
