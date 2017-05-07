const path = require('path')
const tape = require('tape')
const proxyquire = require('proxyquire')
const yoyoify = require('../')

require('jsdom-global')()
require('babel-register')({
  only: /test\/bel/,
  plugins: [yoyoify]
})

// Prefix test names from the `bel` test suite
function wrappedTape (name, fn) {
  return tape(`bel: ${name}`, fn)
}
Object.assign(wrappedTape, tape)

proxyquire('./bel/elements', {
  tape: wrappedTape
})
