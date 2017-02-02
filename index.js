const camelCase = require('camel-case')
const hyperx = require('hyperx')

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

  const createElement = (tag) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElement')),
      [t.stringLiteral(tag)]
    )

  const setDomProperty = (id, prop, value) =>
    t.assignmentExpression('=',
      t.memberExpression(id, t.identifier(prop)),
      value)

  const setDomAttribute = (id, attr, value) =>
    t.callExpression(
      t.memberExpression(id, t.identifier('setAttribute')),
      [t.stringLiteral(attr), value])

  const appendChild = (appendChildId, id, children) =>
    t.callExpression(
      appendChildId,
      [id, t.arrayExpression(children)]
    )

  const requireModule = (id, path) =>
    t.variableDeclaration(
      'var',
      [t.variableDeclarator(
        id,
        t.callExpression(t.identifier('require'), [t.stringLiteral(path)])
      )])

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

    const result = []
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

    function getOnLoadId () {
      if (!state.file.onLoadId) {
        state.file.onLoadId = path.scope.generateUidIdentifier('onload')
      }
      return state.file.onLoadId
    }

    function transform (tag, props, children) {
      const id = path.scope.generateUidIdentifier(getElementName(props, tag))
      path.scope.push({ id })
      result.push(t.assignmentExpression('=', id, createElement(tag)))

      if (props.onload || props.onunload) {
        const onload = props.onload &&
          convertPlaceholders(props.onload).filter(isNotEmptyString)
        const onunload = props.onunload &&
          convertPlaceholders(props.onunload).filter(isNotEmptyString)

        result.push(t.callExpression(getOnLoadId(), [
          id,
          onload && onload.length === 1
            ? onload[0] : t.nullLiteral(),
          onunload && onunload.length === 1
            ? onunload[0] : t.nullLiteral()
        ]))
      }

      Object.keys(props).forEach((propName) => {
        let attrName = propName.toLowerCase()
        if (attrName === 'classname') {
          attrName = 'class'
        }
        if (attrName === 'htmlFor') {
          attrName = 'for'
        }

        if (attrName === 'onload' || attrName === 'onunload') {
          return
        }

        if (attrName.slice(0, 2) === 'on') {
          const value = convertPlaceholders(props[propName]).filter(isNotEmptyString)
          result.push(setDomProperty(id, attrName,
            value.length === 1
              ? value[0]
              : value.map(ensureString).reduce(concatAttribute)
          ))

          return
        }

        result.push(setDomAttribute(id, attrName,
          convertPlaceholders(props[propName])
            .map(ensureString)
            .reduce(concatAttribute)
        ))
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
        result.push(setDomProperty(id, 'textContent', realChildren[0]))
      } else if (realChildren.length > 0) {
        result.push(appendChild(getAppendChildId(), id, realChildren))
      }

      return id
    }

    result.push(root)

    return t.sequenceExpression(result)
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
          if (state.file.onLoadId) {
            path.unshiftContainer('body', requireModule(
              state.file.onLoadId,
              state.opts.onLoadModule || 'on-load'
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
            path.replaceWith(newPath)
          }
        })
      }
    }
  }
}
