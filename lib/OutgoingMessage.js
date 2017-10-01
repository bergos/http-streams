const Transform = require('readable-stream').Transform

class OutgoingMessage extends Transform {
  constructor (options) {
    super()

    options = options || {}

    this.method = options.method
    this.path = options.path
    this.statusCode = options.statucCode || 200
    this.status = options.status || 'OK'
    this.version = options.version || '1.1'
    this.headers = options.headers || {}
    this.body = false
  }

  _transform (chunk, encoding, callback) {
    this.writeHeader()

    this.push(chunk)

    callback()
  }

  _flush (callback) {
    this.writeHeader()

    callback()
  }

  writeHeader () {
    if (!this.body) {
      let startLine

      if (this.method) {
        startLine = this.method.toUpperCase() + ' ' + this.path + ' HTTP/' + this.version
      } else {
        startLine = 'HTTP/' + this.version + ' ' + this.statusCode.toString() + ' ' + this.status
      }

      const headers = Object.keys(this.headers).map((key) => {
        return key.toLowerCase() + ': ' + this.headers[key]
      })

      this.push([startLine].concat(headers).join('\r\n') + '\r\n\r\n')

      this.body = true
    }
  }
}

module.exports = OutgoingMessage
