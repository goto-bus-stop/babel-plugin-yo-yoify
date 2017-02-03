const test = require('tape')
const path = require('path')
const fs = require('fs')
const babel = require('babel-core')
const pify = require('pify')
const yoyoify = require('../')

const transformFixture = pify(babel.transformFile)
const readExpected = pify(fs.readFile)
const writeActual = pify(fs.writeFile)

function testFixture (name) {
  test(name, (t) => {
    t.plan(1)

    const actualPromise = transformFixture(path.join(__dirname, 'fixtures', `${name}.js`), {
      plugins: [yoyoify]
    })
    const expectedPromise = readExpected(path.join(__dirname, 'fixtures', `${name}.expected.js`), 'utf8')

    return Promise.all([ actualPromise, expectedPromise ])
      .then(([ { code }, expectedSrc ]) => {
        const actual = code.trim()
        const expected = expectedSrc.trim()

        t.equal(actual, expected)

        return writeActual(path.join(__dirname, 'fixtures', `${name}.actual.js`), code)
      })
      .then(() => t.end())
  })
}

testFixture('simple')
testFixture('this')
testFixture('variableNames')
testFixture('nesting')
testFixture('elementsChildren')
testFixture('combinedAttr')
testFixture('events')
testFixture('onload')
testFixture('orderOfOperations')
testFixture('svg')
testFixture('require')
