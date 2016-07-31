var MediaType = require("medium-type")
var concat = Array.prototype.concat.bind(Array.prototype)
var TEXT = new MediaType("text/*")
var JSONS = ["application/json", "*/*+json"].map(MediaType.parse)
var ALL = concat(TEXT, JSONS)

exports = module.exports = function(fetch, types) {
  types = types == null ? ALL : normalizeTypes(types)
  return assign(exports.fetch.bind(null, fetch, types), fetch)
}

exports.fetch = function(fetch, types, url, opts) {
  return fetch(url, opts).then(exports.parse.bind(null, types))
}

exports.parse = function(types, res) {
  if (!hasContent(res)) return res
  var type = parseType(res.headers.get("content-type"))
  if (type == null) return res

  switch (matchesTypes(type, types) ? classifyType(type) : null) {
    case "json": return res.text().then(parseJson.bind(null, res))
    case "text": return res.text().then(setBody.bind(null, res))
    case "buffer": return res.arrayBuffer().then(setBody.bind(null, res))
    default: return res
  }
}

function hasContent(res) {
  if (res.bodyUsed) return false
  if (res.status === 204 || res.status === 304) return false
  var contentType = res.headers.get("content-type")
  return contentType != null && contentType !== ""
}

function matchesTypes(type, types) {
  for (var i = 0; i < types.length; ++i) if (type.match(types[i])) return true
  return false
}

function classifyType(type) {
  if (type.type === "text") return "text"
  if (JSONS.some(type.match, type)) return "json"
  return "buffer"
}

function setBody(res, body) {
  return Object.defineProperty(res, "body", {
    value: body, configurable: true, writable: true, enumerable: true
  })
}

function parseJson(res, body) {
  if (body !== "") try { return setBody(res, JSON.parse(body)) }
  catch (ex) { setBody(res, body); throw errorify(res, ex) }
  else return setBody(res, undefined)
}

function errorify(res, err) {
  return Object.defineProperty(err, "response", {
    value: res, configurable: true, writable: true
  })
}

function normalizeType(type) {
  switch (type) {
    case "json": return JSONS
    default: return type instanceof MediaType ? type : new MediaType(type)
  }
}

function parseType(type) {
  try { return new MediaType(type) }
  catch (ex) {
    if (ex instanceof SyntaxError || ex instanceof TypeError) return null
    else throw ex
  }
}

function assign(a, b) { for (var k in b) a[k] = b[k]; return a }
function normalizeTypes(types) { return flatten(types.map(normalizeType)) }
function flatten(array) { return concat.apply(null, array) }
