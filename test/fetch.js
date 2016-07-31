var BODY_USED_ERR = "Body has already been consumed."

try {
  var self = global.self = {}
  require("whatwg-fetch")
  exports = module.exports = self.fetch
  exports.Headers = self.Headers
  exports.Request = self.Request
  exports.Response = self.Response
}
finally { delete global.self }

var Response = exports.Response

Response.prototype.arrayBuffer = function() {
  if (this.bodyUsed) Promise.reject(new TypeError(BODY_USED_ERR))
  var array = new Uint8Array(new Buffer(this._bodyText, "binary"))
  return Promise.resolve(array.buffer)
}

// Cannot reload the polyfill as it mutates world state and doesn't return
// exports.
require("require-guard")(module.id)
