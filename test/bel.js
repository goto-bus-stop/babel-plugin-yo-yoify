const path = require('path')
const yoyoify = require('../')

require('jsdom-global')()
require('babel-register')({
  only: /test\/bel/,
  plugins: [yoyoify]
})

require('./bel/elements')
