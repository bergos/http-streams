const IncomingMessage = require('./lib/IncomingMessage')
const OutgoingMessage = require('./lib/OutgoingMessage')

function fetch (stream, url, options) {
  return new Promise((resolve, reject) => {
    options = options || {}

    const res = new IncomingMessage()

    res.once('response', () => {
      resolve(res)
    })

    res.once('error', reject)

    stream.pipe(res, {
      end: false
    })

    res.req = new OutgoingMessage({
      method: options.method || 'GET',
      path: url,
      headers: options.headers
    })

    res.req.pipe(stream, {
      end: false
    })

    if (options.body) {
      options.body.pipe(res.req)
    } else {
      res.req.end()
    }
  })
}

module.exports = fetch
