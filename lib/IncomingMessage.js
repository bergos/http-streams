const Transform = require('readable-stream').Transform

class IncomingMessage extends Transform {
  constructor () {
    super()

    this.buffer = ''
    this.version = null
    this.method = null
    this.path = null
    this.statusCode = null
    this.status = null
    this.headers = {}
    this.body = false
    this.contentLength = null
    this.contentSent = 0
  }

  _transform (chunk, encoding, callback) {
    this.buffer += chunk.toString()

    if (!this.body) {
      this.parseHeader()

      if (this.body) {
        if (this.method) {
          this.emit('request', this)
        } else {
          this.emit('response', this)
        }
      }
    }

    if (this.body) {
      if (this.contentLength === null) {
        if (this.headers['content-length']) {
          this.contentLength = parseInt(this.headers['content-length'])
        } else {
          this.contentLength = 0
        }
      }

      this.push(this.buffer)
      this.contentSent += this.buffer.length
      this.buffer = ''

      if (this.contentSent >= this.contentLength) {
        this.push(null)
      }
    }

    callback()
  }

  parseHeader () {
    const length = this.buffer.indexOf('\r\n')

    if (length === -1) {
      return
    }

    const line = this.buffer.slice(0, length)

    this.buffer = this.buffer.slice(length + 2)

    if (length === 0) {
      this.body = true

      return
    }

    if (!this.version) {
      const startLine = line.split(' ')

      if (startLine[0].slice(0, 5) === 'HTTP/') {
        this.version = startLine[0].slice(5)
        this.statusCode = parseInt(startLine[1])
        this.status = startLine[2]
      } else {
        this.method = startLine[0]
        this.path = startLine[1]
        this.version = startLine[2].slice(5)
      }
    } else {
      const nameLength = line.indexOf(':')
      const name = line.slice(0, nameLength).toLowerCase()
      const value = line.slice(nameLength + 1).trim()

      this.headers[name.toLowerCase()] = value
    }

    this.parseHeader()
  }
}

module.exports = IncomingMessage
