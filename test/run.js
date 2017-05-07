const test = require('tape')
const vm = require('vm')
const babel = require('babel-core')
const yoyoify = require('../')

require('jsdom-global')()

function transform (source) {
  return babel.transform(source, {
    plugins: [yoyoify]
  })
}

test('interpolate objects', (t) => {
  const src = transform(`
    var bel = require('bel')
    output = bel\`
      <button \${props}>boop</button>
    \`
  `).code

  const props = {
    onclick: () => { /* an event */ },
    disabled: true, // a boolean attribute
    className: 'abc', // an attribute with a different property name
    id: 'def', // a normal attribute
  }
  const context = { document, props, output: '' }

  vm.runInNewContext(src, context)
  const str = context.output.outerHTML

  // check attributes
  t.equal(str, '<button disabled="disabled" class="abc" id="def">boop</button>')

  // events should be assigned as properties
  t.equal(context.output.onclick, props.onclick)

  t.end()
})

