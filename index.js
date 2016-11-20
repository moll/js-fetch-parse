var MediaType = require("medium-type")
var JSONS = ["application/json", "*/*+json"].map(MediaType.parse)
var XMLS = ["application/xml", "text/xml", "*/*+xml"].map(MediaType.parse)
var WILDCARD_PARSER = [[new MediaType("*/*"), null]]
var PARSER_TYPE_ERR = "Parser not a function or true for default: "

exports = module.exports = function(fetch, types) {
  types = types == null ? WILDCARD_PARSER : parseParsers(types)
  return assign(exports.fetch.bind(null, fetch, types), fetch)
}

exports.fetch = function(fetch, types, url, opts) {
  return fetch(url, opts).then(exports.parse.bind(null, types))
}

exports.parse = function(types, res) {
  if (!hasContent(res)) return res
  var type = parseType(res.headers.get("content-type"))
  if (type == null) return res

  var parse = findParser(types, type)
  return parse ? parse(res).then(exports.set.bind(null, res)) : res
}

exports.arrayBuffer = function(res) {
  return res.arrayBuffer()
}

exports.text = function(res) {
  return res.text()
}

exports.json = function(res) {
  /* eslint consistent-return: 0 */
  return res.text().then(function(body) {
    if (body !== "") try { return JSON.parse(body) }
    catch (ex) { exports.set(res, body); throw errorify(res, ex) }
    else return undefined
  })
}

exports.set = function(res, body) {
  return Object.defineProperty(res, "body", {
    value: body, configurable: true, writable: true, enumerable: true
  })
}

function parseParsers(types) {
  return reduce(function(pairs, parser, type) {
    var types = expandType(type)

    if (parser === true)
      return pairs.concat(types.map(function(type) { return [type, null] }))
    else if (typeof parser == "function")
      return pairs.concat(types.map(function(type) { return [type, parser] }))
    else
      throw new TypeError(PARSER_TYPE_ERR + parser)
  }, [], types)
}

function expandType(type) {
  switch (type) {
    case "json": return JSONS
    case "xml": return XMLS
    default: return [new MediaType(type)]
  }
}

function hasContent(res) {
  if (res.bodyUsed) return false
  if (res.status === 204 || res.status === 304) return false
  var contentType = res.headers.get("content-type")
  return contentType != null && contentType !== ""
}

function parseType(type) {
  try { return new MediaType(type) }
  catch (ex) {
    if (ex instanceof SyntaxError || ex instanceof TypeError) return null
    else throw ex
  }
}

function findParser(types, type) {
  for (var i = 0; i < types.length; ++i)
    if (type.match(types[i][0])) return types[i][1] || getDefaultParser(type)

  return null
}

function getDefaultParser(type) {
  if (type.type === "text") return exports.text
  if (JSONS.some(type.match, type)) return exports.json
  if (XMLS.some(type.match, type)) return exports.text
  return exports.arrayBuffer
}

function errorify(res, err) {
  return Object.defineProperty(err, "response", {
    value: res, configurable: true, writable: true
  })
}

function reduce(fn, left, obj) {
  for (var key in obj) left = fn(left, obj[key], key)
  return left
}

function assign(a, b) { for (var k in b) a[k] = b[k]; return a }
