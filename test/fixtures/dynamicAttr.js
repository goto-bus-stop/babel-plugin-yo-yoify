var bel = require('bel')

var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown'

bel`
  <div id="halp" ${handler}=${() => {}} />
`

var className = 'className'
bel`
  <div id="str" ${className}="blub" />
`

