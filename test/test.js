import test from 'ava'
import * as path from 'path'
import { readFile, writeFile } from 'fs'
import { transformFile } from 'babel-core'
import pify from 'pify'
import yoyoify from '../'

const transformFixture = pify(transformFile)
const readExpected = pify(readFile)
const writeActual = pify(writeFile)

function testFixture (name) {
  test(name, (t) => {
    const actualPromise = transformFixture(path.join(__dirname, 'fixtures', `${name}.js`), {
      plugins: [yoyoify]
    })
    const expectedPromise = readExpected(path.join(__dirname, 'fixtures', `${name}.expected.js`), 'utf8')

    return Promise.all([ actualPromise, expectedPromise ])
      .then(([ { code }, expectedSrc ]) => {
        const actual = code.trim()
        const expected = expectedSrc.trim()

        t.is(actual, expected)

        return writeActual(path.join(__dirname, 'fixtures', `${name}.actual.js`), code)
      })
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
