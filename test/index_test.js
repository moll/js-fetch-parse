var Sinon = require("sinon")
var Fetch = require("./fetch")
var FetchBody = require("..")
var fetch = FetchBody(Fetch)
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

  it("must parse both text/* and JSON by default", function*() {
    var res, headers

    res = fetch(URL)
    headers = {"Content-Type": "text/plain"}
    this.requests.pop().respond(200, headers, "Hello")
    ;(yield res).body.must.equal("Hello")

    res = fetch(URL)
    headers = {"Content-Type": "text/html"}
    this.requests.pop().respond(200, headers, "<html>")
    ;(yield res).body.must.equal("<html>")

    res = fetch(URL)
    headers = {"Content-Type": "application/json"}
    this.requests.pop().respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must set body if type given exactly", function*() {
    var fetch = FetchBody(Fetch, ["text/markdown"])
    var res = fetch("/")
    var headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "# Hello")
    yield res.must.then.have.property("body", "# Hello")
  })

  it("must set body if type given with wildcard", function*() {
    var fetch = FetchBody(Fetch, ["text/*"])
    var res = fetch("/")
    var headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "# Hello")
    yield res.must.then.have.property("body", "# Hello")
  })

  it("must not set body if type not given", function*() {
    var fetch = FetchBody(Fetch, ["text/plain"])
    var res = fetch("/")
    var headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  // Just in case protect against an erroneous 204, too.
  it("must not set body when response 204", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(204, headers, "")

    res = yield res
    res.must.not.have.property("body")
    yield res.text().must.then.equal("")
  })

  // Facebook's API does that: return a Content-Type header, but no body with
  // its 304 Not Modified
  it("must not set body when response 304", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(304, headers, "")

    res = yield res
    res.must.not.have.property("body")
    yield res.text().must.then.equal("")
  })

  it("must not set body if Content-Type unrecognized", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application/fancy"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application/fancy")
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not set body if Content-Type invalid", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application///"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application///")
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not set body if Content-Type missing", function*() {
    var res = fetch(URL)
    this.requests[0].respond(200, {}, "Hello")

    res = yield res
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not parse multiple times", function*() {
    var fetch = Fetch
    fetch = FetchBody(fetch)
    fetch = FetchBody(fetch)
    var res = fetch("/")

    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    res = yield res
    res.body.must.eql({key: "value"})
  })

  describe("when Content-Type is text", function() {
    it("must set body given \"text/plain\"", function*() {
      var fetch = FetchBody(Fetch, ["text/plain"])
      var res = fetch("/")
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body if Content-Type is text/plain", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body if Content-Type is text/plain", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body if Content-Type is text/plain; charset=utf-8",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain; charset=utf-8"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body when Content-Type is text/javascript", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/javascript"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.equal(JSON.stringify({key: "value"}))
    })

    it("must set body if Content-Length 0", function*() {
      var res = fetch(URL, {method: "HEAD"})
      var headers = {"Content-Type": "text/plain", "Content-Length": "0"}
      this.requests[0].respond(200, headers, "")
      ;(yield res).body.must.equal("")
    })

    it("must set body when response not OK", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(401, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })
  })

  describe("when Content-Type is JSON", function() {
    it("must parse JSON given \"json\"", function*() {
      var fetch = FetchBody(Fetch, ["json"])

      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse JSON given \"application/json\"", function*() {
      var fetch = FetchBody(Fetch, ["application/json"])

      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse when Content-Type is application/json", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse when Content-Type is application/json; charset=utf-8",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/json; charset=utf-8"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse when Content-Type is application/vnd.foo+json", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/vnd.foo+json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse when Content-Type is application/vnd.foo+json; v=1",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/vnd.foo+json; v=1"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse when response not OK", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(401, headers, JSON.stringify({key: "value"}))

      res = yield res
      res.status.must.equal(401)
      res.body.must.eql({key: "value"})
    })

    it("must not parse JSON if not asked", function*() {
      var fetch = FetchBody(Fetch, ["text/plain"])
      var res = fetch("/")
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      res = yield res
      res.must.not.have.property("body")
      yield res.text().must.then.equal(JSON.stringify({key: "value"}))
    })

    // Some implementations respond to HEAD requests with a Content-Type, but
    // Content-Lenght of 0. This saves throwing a parse error.
    it("must not set body if Content-Length 0", function*() {
      var res = fetch(URL, {method: "HEAD"})
      var headers = {"Content-Type": "application/json", "Content-Length": "0"}
      this.requests[0].respond(200, headers, "")

      res = yield res
      res.must.not.have.property("body")
      yield res.text().must.then.equal("")
    })

    // This was a released bug with Remote that I noticed on Nov 25, 2014 and
    // was related to parsing errors not being caught and passed to the
    // response error handler. Nor its related promise.
    it("must reject with SyntaxError given invalid JSON", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, "{\"foo\": ")

      var err
      try { yield res } catch (ex) { err = ex }
      err.must.be.an.error(SyntaxError, "Unexpected end of input")
      err.must.have.nonenumerable("response")
      err.response.must.be.an.instanceof(Fetch.Response)
      err.response.must.have.property("body", undefined)
    })
  })
})
