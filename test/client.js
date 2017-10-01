/* global describe it */

const assert = require('assert')
const concatStream = require('concat-stream')
const duplexify = require('duplexify')
const httpClient = require('../client')
const stringToStream = require('string-to-stream')
const PassThrough = require('readable-stream').PassThrough

describe('http-stream-client', () => {
  it('should send the request line', () => {
    return new Promise((resolve, reject) => {
      const incoming = new PassThrough()
      const outgoing = new PassThrough()
      const stream = duplexify(incoming, outgoing)

      incoming.pipe(concatStream((requestString) => {
        Promise.resolve().then(() => {
          assert.equal(requestString.toString(), 'GET / HTTP/1.1\r\n\r\n')
        }).then(resolve).catch(reject)

        outgoing.write('HTTP/1.1 200 OK\r\n\r\n')
      }))

      setTimeout(() => {
        incoming.emit('end')
      }, 100)

      return httpClient(stream, '/')
    })
  })

  it('should send the request header fields', () => {
    const accept = 'application/json'
    const link = '</context>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

    return new Promise((resolve, reject) => {
      const incoming = new PassThrough()
      const outgoing = new PassThrough()
      const stream = duplexify(incoming, outgoing)

      incoming.pipe(concatStream((requestString) => {
        Promise.resolve().then(() => {
          assert.equal(requestString.toString(), 'GET / HTTP/1.1\r\naccept: ' + accept + '\r\nlink: ' + link + '\r\n\r\n')
        }).then(resolve).catch(reject)

        outgoing.write('HTTP/1.1 200 OK\r\n\r\n')
      }))

      setTimeout(() => {
        incoming.emit('end')
      }, 100)

      return httpClient(stream, '/', {
        headers: {
          accept: [accept],
          link: [link]
        }
      })
    })
  })

  it('should send the request content', () => {
    const content = 'test'

    return new Promise((resolve, reject) => {
      const incoming = new PassThrough()
      const outgoing = new PassThrough()
      const stream = duplexify(incoming, outgoing)

      incoming.pipe(concatStream((requestString) => {
        Promise.resolve().then(() => {
          assert.equal(requestString.toString(), 'POST / HTTP/1.1\r\ncontent-length: ' + content.length + '\r\n\r\n' + content)
        }).then(resolve).catch(reject)

        outgoing.write('HTTP/1.1 200 OK\r\n\r\n')
      }))

      setTimeout(() => {
        incoming.emit('end')
      }, 100)

      return httpClient(stream, '/', {
        method: 'POST',
        headers: {
          'content-length': [content.length]
        },
        body: stringToStream(content)
      })
    })
  })

  it('should assign the status and status code to the response', () => {
    const incoming = new PassThrough()
    const outgoing = new PassThrough()
    const stream = duplexify(incoming, outgoing)

    incoming.resume()

    setTimeout(() => {
      outgoing.write('HTTP/1.1 200 OK\r\n\r\n')
    }, 100)

    return httpClient(stream, '/').then((res) => {
      assert.equal(res.statusCode, 200)
      assert.equal(res.status, 'OK')
    })
  })

  it('should assign all headers to the response with lower case keys', () => {
    const contentType = 'application/json'
    const link = '</context>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

    const incoming = new PassThrough()
    const outgoing = new PassThrough()
    const stream = duplexify(incoming, outgoing)

    incoming.resume()

    setTimeout(() => {
      outgoing.write('HTTP/1.1 200 OK\r\nContent-Type: ' + contentType + '\r\nLink: ' + link + '\r\n\r\n')
    }, 100)

    return httpClient(stream, '/').then((res) => {
      assert.deepEqual(res.headers['content-type'], contentType)
      assert.deepEqual(res.headers.link, link)
    })
  })

  it('should forward the response content', () => {
    const content = 'test'

    const incoming = new PassThrough()
    const outgoing = new PassThrough()
    const stream = duplexify(incoming, outgoing)

    incoming.resume()

    setTimeout(() => {
      outgoing.write('HTTP/1.1 200 OK\r\ncontent-length: ' + content.length + '\r\n\r\n' + content)
    }, 100)

    return httpClient(stream, '/').then((res) => {
      return new Promise((resolve, reject) => {
        res.pipe(concatStream((sentContent) => {
          Promise.resolve().then(() => {
            assert.equal(sentContent.toString(), content)
          }).then(resolve).catch(reject)
        }))
      })
    })
  })

  it('should not close the stream after request handling', () => {
    const incoming = new PassThrough()
    const outgoing = new PassThrough()
    const stream = duplexify(incoming, outgoing)

    incoming.resume()

    setTimeout(() => {
      outgoing.write('HTTP/1.1 200 OK\r\n\r\n')
    }, 100)

    return httpClient(stream, '/').then(() => {
      assert.equal(stream._readableState.ended, false)
      assert.equal(stream._writableState.finished, false)
    })
  })

  it('should a response with multiple chunks', () => {
    const content1 = 'test1'
    const content2 = 'test2'

    const incoming = new PassThrough()
    const outgoing = new PassThrough()
    const stream = duplexify(incoming, outgoing)

    incoming.resume()

    setTimeout(() => {
      outgoing.write('HTTP/1.1 200 OK\r\n')
      outgoing.write('content-length: ' + (content1.length + content2.length) + '\r\n')
      outgoing.write('\r\n')
      outgoing.write(content1)
      outgoing.write(content2)
    }, 100)

    return httpClient(stream, '/').then((res) => {
      return new Promise((resolve, reject) => {
        res.pipe(concatStream((sentContent) => {
          Promise.resolve().then(() => {
            assert.equal(sentContent.toString(), content1 + content2)
          }).then(resolve).catch(reject)
        }))
      })
    })
  })
})
