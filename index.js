var MediaType = require("medium-type")
var TEXT = new MediaType("text/plain")
var JSONS = ["application/json", "text/javascript", "*/*+json"].map(MediaType)

exports = module.exports = function(fetch) {
  return assign(exports.fetch.bind(null, fetch), fetch)
}

exports.fetch = function(fetch, url, opts) {
  return fetch(url, opts).then(exports.parse)
}

exports.parse = function(res) {
  switch (isParseable(res) && typeOf(res.headers.get("content-type"))) {
    case "json":
      return res.json().then(setBody.bind(null, res), onError.bind(null, res))
    case "text":
      return res.text().then(setBody.bind(null, res))
    default:
      return res
  }
}

function isParseable(res) {
  if (res.bodyUsed) return false
  if (res.status === 204 || res.status === 304) return false
  var contentType = res.headers.get("content-type")
  return contentType != null && contentType !== ""
}

function typeOf(type) {
  type = parseType(type)
  if (type == null) return null
  if (type.match(TEXT)) return "text"
  if (JSONS.some(type.match, type)) return "json"
  return null
}

function setBody(res, body) {
  res.body = body
  return res
}

function parseType(type) {
  try { return new MediaType(type) }
  catch (ex) { if (ex instanceof SyntaxError) return null; throw ex }
}

function onError(res, err) {
  setBody(res, undefined)
  throw Object.defineProperty(err, "response", {
    value: res, configurable: true, writable: true
  })
}

function assign(target, source) {
  for (var key in source) target[key] = source[key]
  return target
}
