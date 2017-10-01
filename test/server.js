/* global describe it */

const assert = require('assert')
const concatStream = require('concat-stream')
const httpServer = require('../server')

describe('http-stream-server', () => {
  it('should return a Duplex stream', () => {
    const server = httpServer(() => {})

    assert.equal(server.readable, true)
    assert.equal(server.writable, true)
  })

  it('should assign the method and path to the request', () => {
    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        Promise.resolve().then(() => {
          assert.equal(req.method, 'GET')
          assert.equal(req.path, '/')
        }).then(resolve).catch(reject)

        res.end()
      })

      server.write('GET / HTTP/1.1\r\n\r\n')
    })
  })

  it('should assign all headers to the request with lower case key', () => {
    const accept = 'application/json'
    const link = '</context>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        Promise.resolve().then(() => {
          assert.deepEqual(req.headers.accept, accept)
          assert.deepEqual(req.headers.link, link)
        }).then(resolve).catch(reject)

        res.end()
      })

      server.write('GET / HTTP/1.1\r\nAccept:' + accept + '\r\nLink: ' + link + '\r\n\r\n')
    })
  })

  it('should forward the request content', () => {
    const content = 'test'

    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        req.pipe(concatStream((sentContent) => {
          Promise.resolve().then(() => {
            assert.equal(sentContent.toString(), content)
          }).then(resolve).catch(reject)

          res.end()
        }))
      })

      server.write('POST / HTTP/1.1\r\ncontent-length: ' + content.length + '\r\n\r\n' + content)
    })
  })

  it('should send the response status line', () => {
    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        res.end()
      })

      server.write('GET / HTTP/1.1\r\n\r\n')

      server.pipe(concatStream((responseString) => {
        Promise.resolve().then(() => {
          assert.equal(responseString.toString(), 'HTTP/1.1 200 OK\r\n\r\n')
        }).then(resolve).catch(reject)
      }))

      process.nextTick(() => {
        server.emit('end')
      })
    })
  })

  it('should send the response headers', () => {
    const contentType = 'application/json'
    const link = '</context>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'

    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        res.headers['content-type'] = [contentType]
        res.headers.link = [link]
        res.end()
      })

      server.write('GET / HTTP/1.1\r\n\r\n')

      server.pipe(concatStream((responseString) => {
        Promise.resolve().then(() => {
          assert.equal(responseString.toString(), 'HTTP/1.1 200 OK\r\ncontent-type: ' + contentType + '\r\nlink: ' + link + '\r\n\r\n')
        }).then(resolve).catch(reject)
      }))

      process.nextTick(() => {
        server.emit('end')
      })
    })
  })

  it('should send the response content', () => {
    const content = 'test'

    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        res.headers['content-length'] = [content.length]
        res.end(content)
      })

      server.write('GET / HTTP/1.1\r\n\r\n')

      server.pipe(concatStream((responseString) => {
        Promise.resolve().then(() => {
          assert.equal(responseString.toString(), 'HTTP/1.1 200 OK\r\ncontent-length: ' + content.length + '\r\n\r\n' + content)
        }).then(resolve).catch(reject)
      }))

      process.nextTick(() => {
        server.emit('end')
      })
    })
  })

  it('should not close stream after request handling', () => {
    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        res.end()
      })

      server.write('GET / HTTP/1.1\r\n\r\n')
      server.resume()

      process.nextTick(() => {
        Promise.resolve().then(() => {
          assert.equal(server._readableState.ended, false)
          assert.equal(server._writableState.finished, false)
        }).then(resolve).catch(reject)
      })
    })
  })

  it('should handle a request with multiple chunks', () => {
    const content1 = 'test1'
    const content2 = 'test2'

    return new Promise((resolve, reject) => {
      const server = httpServer((req, res) => {
        req.pipe(concatStream((sentContent) => {
          Promise.resolve().then(() => {
            assert.equal(sentContent.toString(), content1 + content2)
          }).then(resolve).catch(reject)

          res.end()
        }))
      })

      server.write('POST / HTTP/1.1\r\n')
      server.write('content-length: ' + (content1.length + content2.length) + '\r\n')
      server.write('\r\n')
      server.write(content1)
      server.write(content2)
    })
  })
})
