const camelCase = require('camel-case')
const template = require('babel-template')
const hyperx = require('hyperx')

const simpleTag = template(`
  var ID = document.createElement(TAG)
`)

const setAttribute = template(`
  ID.setAttribute(ATTRIBUTE, VALUE)
`)

const setProperty = template(`
  ID.PROPERTY = VALUE
`)

const setTextContent = template(`
  ID.textContent = CONTENT
`)

const appendChild = template(`
  APPEND(ID, [CHILD])
`)

function getElementName (props, tag) {
  if (typeof props.id === 'string' && !placeholderRe.test(props.id)) {
    return camelCase(props.id)
  }
  if (typeof props.className === 'string' && !placeholderRe.test(props.className)) {
    return camelCase(props.className.split(' ')[0])
  }
  return tag || 'bel'
}

const placeholderRe = /\0(\d+)\0/g

const getPlaceholder = (i) => `\0${i}\0`

module.exports = ({ types: t }) => {
  const belModuleNames = ['bel', 'yo-yo', 'choo', 'choo/html']

  function requireModule (id, path) {
    return t.variableDeclaration(
      'var',
      [t.variableDeclarator(
        id,
        t.callExpression(t.identifier('require'), [t.stringLiteral(path)])
      )]
    )
  }

  const ensureString = (node) => {
    if (t.isStringLiteral(node)) {
      return node
    }
    return t.callExpression(t.identifier('String'), [node])
  }

  const concatAttribute = (left, right) =>
    t.binaryExpression('+', left, right)

  const isNotEmptyString = (node) =>
    !t.isStringLiteral(node, { value: '' })

  /**
   * Transform a template literal into raw DOM calls.
   */
  const yoyoify = (path, state) => {
    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions
    const expressionPlaceholders = expressions.map((expr, i) => getPlaceholder(i))

    const result = [];
    const root = hyperx(transform).apply(null, [quasis].concat(expressionPlaceholders))

    function convertPlaceholders (value) {
      // Probably AST nodes.
      if (typeof value !== 'string') {
        return [value]
      }

      const items = value.split(placeholderRe)
      let placeholder = true
      return items.map((item) => {
        placeholder = !placeholder
        return placeholder ? expressions[item] : t.stringLiteral(item)
      })
    }

    function getAppendChildId () {
      if (!state.file.appendChildId) {
        state.file.appendChildId = path.scope.generateUidIdentifier('appendChild')
      }
      return state.file.appendChildId
    }

    function transform (tag, props, children) {
      const id = path.scope.generateUidIdentifier(getElementName(props, tag))
      result.push(simpleTag({
        ID: id,
        TAG: t.stringLiteral(tag)
      }))

      Object.keys(props).forEach((propName) => {
        let attrName = propName.toLowerCase()
        if (attrName === 'classname') {
          attrName = 'class'
        }
        if (attrName === 'htmlFor') {
          attrName = 'for'
        }

        if (attrName.slice(0, 2) === 'on') {
          const value = convertPlaceholders(props[propName]).filter(isNotEmptyString)
          result.push(setProperty({
            ID: id,
            PROPERTY: t.identifier(attrName),
            VALUE: value.length === 1
              ? value[0]
              : value.map(ensureString).reduce(concatAttribute)
          }))

          return
        }

        result.push(setAttribute({
          ID: id,
          ATTRIBUTE: t.stringLiteral(attrName),
          VALUE: convertPlaceholders(props[propName])
            .map(ensureString)
            .reduce(concatAttribute)
        }))
      })

      if (!Array.isArray(children)) {
        return id
      }

      const realChildren = children.map(convertPlaceholders)
        // Flatten
        .reduce((flat, arr) => flat.concat(arr), [])
        // Remove empty strings since they don't affect output
        .filter(isNotEmptyString)

      if (realChildren.length === 1 && t.isStringLiteral(realChildren[0])) {
        // Plain strings can be added as textContent straight away.
        result.push(setTextContent({
          ID: id,
          CONTENT: realChildren[0]
        }))
      } else if (realChildren.length > 0) {
        result.push(appendChild({
          APPEND: getAppendChildId(),
          ID: id,
          CHILD: realChildren
        }))
      }

      return id
    }

    result.push(t.returnStatement(root))

    const fn = t.functionExpression(null, [], t.blockStatement(result))
    fn.shadow = { this: true }
    return t.callExpression(fn, [])
  }

  return {
    visitor: {
      Program: {
        enter (path, state) {
          state.file.yoyoVariables = []
        },
        exit (path, state) {
          if (state.file.appendChildId) {
            path.unshiftContainer('body', requireModule(
              state.file.appendChildId,
              state.opts.appendChildModule || 'yo-yoify/lib/appendChild'
            ))
          }
        }
      },

      /**
       * Collect bel variable names and remove their imports if necessary.
       */
      ImportDeclaration (path, state) {
        const importFrom = path.get('source').node.value
        if (belModuleNames.indexOf(importFrom) !== -1) {
          const specifier = path.get('specifiers')[0]
          if (specifier.isImportDefaultSpecifier()) {
            state.file.yoyoVariables.push(specifier.get('local').node.name)
          }

          if (importFrom === 'bel') {
            path.remove()
          }
        }
      },

      TaggedTemplateExpression (path, state) {
        state.file.yoyoVariables.forEach((name) => {
          if (path.get('tag').isIdentifier({ name })) {
            const newPath = yoyoify(path.get('quasi'), state)
            path.replaceWith(newPath);
          }
        })
      }
    }
  }
}
