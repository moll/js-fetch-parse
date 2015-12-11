var Sinon = require("sinon")
var Fetch = require("./fetch")
var fetch = require("..")(Fetch)
var URL = "http://example.com"

describe("FetchBody", function() {
  beforeEach(function() {
    var xhr = global.XMLHttpRequest = Sinon.FakeXMLHttpRequest
    xhr.onCreate = Array.prototype.push.bind(this.requests = [])
  })

  it("must return fetch with Headers, Request and Response", function() {
    fetch.Headers.must.equal(Fetch.Headers)
    fetch.Request.must.equal(Fetch.Request)
    fetch.Response.must.equal(Fetch.Response)
  })

  it("must set body when Content-Type is application/json", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must set body when Content-Type is application/json; charset=utf-8",
    function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json; charset=utf-8"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must set body when Content-Type is application/vnd.foo+json",
    function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/vnd.foo+json"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must set body when Content-Type is text/javascript", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "text/javascript"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  // This was a released bug with Remote that I noticed on Nov 25, 2014 and was
  // related to parsing errors not being caught and passed to the response
  // error handler. Nor its related promise.
  it("must reject with SyntaxError given invalid JSON", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(200, headers, "{\"foo\": ")

    var err
    try { yield res } catch (ex) { err = ex }
    err.must.be.an.error(SyntaxError, "Unexpected end of input")
  })

  it("must set body if Content-Type is text/plain", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "text/plain"}
    this.requests[0].respond(200, headers, "Hello")
    ;(yield res).body.must.equal("Hello")
  })

  it("must set body if Content-Type is text/plain; charset=utf-8", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "text/plain; charset=utf-8"}
    this.requests[0].respond(200, headers, "Hello")
    ;(yield res).body.must.equal("Hello")
  })

  it("must set body when response not OK", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(401, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  // Just in case protect against an erroneous 204, too.
  it("must not set body when response 204", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(204, headers, "")
    yield res.must.then.have.property("body", undefined)
  })

  // Facebook's API does that: return a Content-Type header, but no body with
  // its 304 Not Modified
  it("must not set body when response 304", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(304, headers, "")
    yield res.must.then.have.property("body", undefined)
  })

  it("must set body undefined if Content-Type unrecognized", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/fancy"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application/fancy")
    res.must.have.property("body", undefined)
    yield res.text().must.then.equal("Hello")
  })

  it("must set body undefined if Content-Type invalid", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application///"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application///")
    res.must.have.property("body", undefined)
    yield res.text().must.then.equal("Hello")
  })

  it("must set body undefined if Content-Type missing", function*() {
    var res = fetch(URL)
    this.requests[0].respond(200, {}, "Hello")

    res = yield res
    res.must.have.property("body", undefined)
    yield res.text().must.then.equal("Hello")
  })
})
