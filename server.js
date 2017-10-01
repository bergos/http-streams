const duplexify = require('duplexify')
const PassThrough = require('readable-stream').PassThrough
const IncomingMessage = require('./lib/IncomingMessage')
const OutgoingMessage = require('./lib/OutgoingMessage')

function server (handler) {
  const incoming = new PassThrough()
  const outgoing = new PassThrough()
  let req = null

  function next () {
    req = new IncomingMessage()

    req.once('request', () => {
      const res = new OutgoingMessage()

      res.once('finish', () => {
        req.resume()

        incoming.unpipe(req)
        res.unpipe(outgoing)

        next()
      })

      res.pipe(outgoing, {
        end: false
      })

      handler(req, res)
    })

    incoming.pipe(req)
  }

  next()

  return duplexify(incoming, outgoing)
}

module.exports = server
