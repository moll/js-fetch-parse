var Sinon = require("sinon")
var Fetch = require("./fetch")
var FetchParse = require("..")
var fetch = FetchParse(Fetch)
var URL = "http://example.com"
var GIF = new Buffer("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64")

describe("FetchParse", function() {
  beforeEach(function() {
    var xhr = global.XMLHttpRequest = Sinon.FakeXMLHttpRequest
    xhr.onCreate = Array.prototype.push.bind(this.requests = [])
  })

  it("must return fetch with Headers, Request and Response", function() {
    fetch.Headers.must.equal(Fetch.Headers)
    fetch.Request.must.equal(Fetch.Request)
    fetch.Response.must.equal(Fetch.Response)
  })

  it("must parse all with default parser given */*", function*() {
    var res, headers
    var fetch = FetchParse(Fetch, {"*/*": true})

    res = fetch(URL)
    headers = {"Content-Type": "text/plain"}
    this.requests.pop().respond(200, headers, "Hello")
    ;(yield res).body.must.equal("Hello")

    res = fetch(URL)
    headers = {"Content-Type": "application/json"}
    this.requests.pop().respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must parse */* with given parser", function*() {
    var fetch = FetchParse(Fetch, {
      "*/*": function(res) {
        res.must.be.an.instanceof(Fetch.Response)
        return Promise.resolve("Bye")
      }
    })

    var res = fetch(URL)
    var headers = {"Content-Type": "text/plain"}
    this.requests[0].respond(200, headers, "Hello")
    ;(yield res).body.must.equal("Bye")
  })

  it("must parse one with given parser and */* with default", function*() {
    var res, headers

    var fetch = FetchParse(Fetch, {
      "text/markdown": function(res) { return Promise.resolve("# Bye") },
      "*/*": true
    })

    res = fetch(URL)
    headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "# Hello")
    yield res.must.then.have.property("body", "# Bye")

    res = fetch(URL)
    headers = {"Content-Type": "application/json"}
    this.requests.pop().respond(200, headers, JSON.stringify({key: "value"}))
    ;(yield res).body.must.eql({key: "value"})
  })

  it("must set body if type given exactly", function*() {
    var fetch = FetchParse(Fetch, {"text/markdown": true})
    var res = fetch("/")
    var headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "# Hello")
    yield res.must.then.have.property("body", "# Hello")
  })

  it("must set body if type given with wildcard", function*() {
    var fetch = FetchParse(Fetch, {"text/*": true})
    var res = fetch("/")
    var headers = {"Content-Type": "text/markdown"}
    this.requests[0].respond(200, headers, "# Hello")
    yield res.must.then.have.property("body", "# Hello")
  })

  it("must not set body if type not given", function*() {
    var fetch = FetchParse(Fetch, {"text/plain": true})
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

  it("must not set body when Content-Type unrecognized", function*() {
    var fetch = FetchParse(Fetch, {"application/json": true})
    var res = fetch(URL)
    var headers = {"Content-Type": "application/fancy"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application/fancy")
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not set body when Content-Type invalid", function*() {
    var res = fetch(URL)
    var headers = {"Content-Type": "application///"}
    this.requests[0].respond(200, headers, "Hello")

    res = yield res
    res.headers.get("content-type").must.equal("application///")
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not set body when Content-Type missing", function*() {
    var res = fetch(URL)
    this.requests[0].respond(200, {}, "Hello")

    res = yield res
    res.must.not.have.property("body")
    yield res.text().must.then.equal("Hello")
  })

  it("must not parse multiple times", function*() {
    var fetch = Fetch
    fetch = FetchParse(fetch)
    fetch = FetchParse(fetch)
    var res = fetch("/")

    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    res = yield res
    res.body.must.eql({key: "value"})
  })

  // Google Chrome uses the `body` property for streaming. It's implemented
  // as an enumerable getter with no setter:
  it("must set body even if a setter", function*() {
    function fetch(url, opts) {
      return Fetch(url, opts).then(function(res) {
        return Object.defineProperty(res, "body", {
          get: Object, configurable: true, enumerable: true
        })
      })
    }

    var res = FetchParse(fetch)("/")
    var headers = {"Content-Type": "application/json"}
    this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
    res = yield res
    res.body.must.eql({key: "value"})
  })

  describe("when Content-Type is text", function() {
    it("must set body by default when Content-Type is text/plain", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body when Content-Type is text/plain", function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "text/plain"}
      this.requests[0].respond(200, headers, "Hello")
      ;(yield res).body.must.equal("Hello")
    })

    it("must set body when Content-Type is text/plain; charset=utf-8",
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

    it("must set body when Content-Length 0", function*() {
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

    describe("given text/plain", function() {
      it("must set body when Content-Type is text/plain", function*() {
        var fetch = FetchParse(Fetch, {"text/plain": true})
        var res = fetch("/")
        var headers = {"Content-Type": "text/plain"}
        this.requests[0].respond(200, headers, "Hello")
        ;(yield res).body.must.equal("Hello")
      })
    })
  })

  describe("when Content-Type is JSON", function() {
    it("must parse by default when Content-Type is application/json",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      ;(yield res).body.must.eql({key: "value"})
    })

    it("must parse by default when Content-Type is application/vnd.foo+json",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/vnd.foo+json"}
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
      var fetch = FetchParse(Fetch, {"text/plain": true})
      var res = fetch("/")
      var headers = {"Content-Type": "application/json"}
      this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
      res = yield res
      res.must.not.have.property("body")
      yield res.text().must.then.equal(JSON.stringify({key: "value"}))
    })

    // Some implementations respond to HEAD requests with a Content-Type, but
    // Content-Lenght of 0. This saves throwing a parse error.
    it("must set body to undefined when Content-Length is 0", function*() {
      var res = fetch(URL, {method: "HEAD"})
      var headers = {"Content-Type": "application/json", "Content-Length": "0"}
      this.requests[0].respond(200, headers, "")

      res = yield res
      res.must.have.property("body", undefined)
      res.bodyUsed.must.be.true()
    })

    it("must set body to undefined when Content-Length, but no content",
      function*() {
      var res = fetch(URL, {method: "HEAD"})
      var headers = {"Content-Type": "application/json", "Content-Length": "13"}
      this.requests[0].respond(200, headers, "")

      res = yield res
      res.must.have.property("body", undefined)
      res.bodyUsed.must.be.true()
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
      err.must.be.an.error(SyntaxError, /Unexpected end/)
      err.must.have.nonenumerable("response")
      err.response.must.be.an.instanceof(Fetch.Response)
      err.response.must.have.property("body", "{\"foo\": ")
    })

    describe("given json", function() {
      var fetch = FetchParse(Fetch, {"json": true})

      it("must parse when Content-Type is application/json",
        function*() {
        var res = fetch(URL)
        var headers = {"Content-Type": "application/json"}
        this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
        ;(yield res).body.must.eql({key: "value"})
      })

      it("must parse with parser when Content-Type is application/json",
        function*() {
        var fetch = FetchParse(Fetch, {
          "json": function(res) {
            return res.json().then(function(obj) { return {lock: obj} })
          }
        })

        var res = fetch(URL)
        var headers = {"Content-Type": "application/json"}
        this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
        ;(yield res).body.must.eql({lock: {key: "value"}})
      })

      it("must parse when Content-Type is application/json; charset=utf-8",
        function*() {
        var res = fetch(URL)
        var headers = {"Content-Type": "application/json; charset=utf-8"}
        this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
        ;(yield res).body.must.eql({key: "value"})
      })

      it("must parse when Content-Type is application/vnd.foo+json",
        function*() {
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
    })

    describe("given application/json", function() {
      it("must parse JSON when Content-Type is application/json", function*() {
        var fetch = FetchParse(Fetch, {"application/json": true})

        var res = fetch(URL)
        var headers = {"Content-Type": "application/json"}
        this.requests[0].respond(200, headers, JSON.stringify({key: "value"}))
        ;(yield res).body.must.eql({key: "value"})
      })
    })
  })

  describe("when Content-Type is XML", function() {
    it("must set body by default when Content-Type is application/xml",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/xml"}
      this.requests[0].respond(200, headers, "<name>John</name>")
      ;(yield res).body.must.equal("<name>John</name>")
    })

    it("must set body by default when Content-Type is application/vnd.foo+xml",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/vnd.foo+xml"}
      this.requests[0].respond(200, headers, "<name>John</name>")
      ;(yield res).body.must.equal("<name>John</name>")
    })

    describe("given xml", function() {
      var fetch = FetchParse(Fetch, {"xml": true})

      it("must set body when Content-Type is application/xml", function*() {
        var res = fetch(URL)
        var headers = {"Content-Type": "application/xml"}
        this.requests[0].respond(200, headers, "<name>John</name>")
        ;(yield res).body.must.equal("<name>John</name>")
      })

      it("must parse given parser", function*() {
        var fetch = FetchParse(Fetch, {
          "xml": function(res) {
            return res.text().then(function(obj) { return {name: "John"} })
          }
        })

        var res = fetch(URL)
        var headers = {"Content-Type": "application/xml"}
        this.requests[0].respond(200, headers, "<name>John</name>")
        ;(yield res).body.must.eql({name: "John"})
      })

      it("must parse when Content-Type is application/xml; charset=utf-8",
        function*() {
        var res = fetch(URL)
        var headers = {"Content-Type": "application/xml; charset=utf-8"}
        this.requests[0].respond(200, headers, "<name>John</name>")
        ;(yield res).body.must.equal("<name>John</name>")
      })

      it("must parse when Content-Type is application/vnd.foo+xml",
        function*() {
        var res = fetch(URL)
        var headers = {"Content-Type": "application/vnd.foo+xml"}
        this.requests[0].respond(200, headers, "<name>John</name>")
        ;(yield res).body.must.equal("<name>John</name>")
      })
    })

    describe("given application/xml", function() {
      it("must set body if Content-Type is application/xml", function*() {
        var fetch = FetchParse(Fetch, {"application/xml": true})

        var res = fetch(URL)
        var headers = {"Content-Type": "application/xml"}
        this.requests[0].respond(200, headers, "<name>John</name>")
        ;(yield res).body.must.equal("<name>John</name>")
      })
    })
  })

  describe("when Content-Type is binary", function() {
    it("must set body by default when Content-Type is application/octet-stream",
      function*() {
      var res = fetch(URL)
      var headers = {"Content-Type": "application/octet-stream"}
      this.requests[0].respond(200, headers, GIF.toString("binary"))
      res = yield res
      res.body.must.be.an.instanceof(ArrayBuffer)
      new Buffer(res.body).equals(GIF).must.be.true()
    })

    describe("given application/*", function() {
      it("must set body when Content-Type is application/octet-stream",
        function*() {
        var fetch = FetchParse(Fetch, {"application/*": true})
        var res = fetch("/")
        var headers = {"Content-Type": "application/octet-stream"}
        this.requests[0].respond(200, headers, GIF.toString("binary"))
        res = yield res
        res.body.must.be.an.instanceof(ArrayBuffer)
        new Buffer(res.body).equals(GIF).must.be.true()
      })
    })
  })
})
