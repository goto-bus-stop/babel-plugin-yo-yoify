const camelCase = require('camel-case')
const template = require('babel-template')
const hyperx = require('hyperx')

const simpleTag = template(`
  var ID = document.createElement(TAG)
`)

const setAttribute = template(`
  ID.setAttribute(ATTRIBUTE, VALUE)
`)

const setTextContent = template(`
  ID.textContent = CONTENT
`)

const appendChild = template(`
  APPEND(ID, [CHILD])
`)

const importAppendChild = template(`
  var ID = require(PATH)
`)

function getElementName (props, tag) {
  if (typeof props.id === 'string') {
    return camelCase(props.id)
  }
  if (typeof props.className === 'string') {
    return camelCase(props.className.split(' ')[0])
  }
  return tag || 'bel'
}

const placeholderRe = /^\0(\d+)\0$/

function isPlaceholder (val) {
  return placeholderRe.test(val)
}

module.exports = ({ types: t }) => {
  const belModuleNames = ['bel', 'yo-yo', 'choo', 'choo/html']

  /**
   * Transform a template literal into raw DOM calls.
   */
  const yoyoify = (path, state) => {
    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions
    const expressionPlaceholders = expressions.map((expr, i) => `\0${i}\0`)

    const result = [];
    const root = hyperx(transform).apply(null, [quasis].concat(expressionPlaceholders))

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

        let value = props[propName]
        if (isPlaceholder(value)) {
          value = expressions[value.replace(placeholderRe, '$1')]
        }

        result.push(setAttribute({
          ID: id,
          ATTRIBUTE: t.stringLiteral(attrName),
          VALUE: typeof value === 'string' ? t.stringLiteral(value) : value
        }))
      })

      if (!Array.isArray(children)) {
        return id
      }

      const realChildren = children.map((child) => {
        if (isPlaceholder(child)) {
          return expressions[child.replace(placeholderRe, '$1')]
        }
        return child
      })

      if (realChildren.length === 1 && typeof realChildren[0] === 'string') {
        // Plain strings can be added as textContent straight away.
        result.push(setTextContent({
          ID: id,
          CONTENT: t.stringLiteral(realChildren[0])
        }))
      } else {
        result.push(appendChild({
          APPEND: getAppendChildId(),
          ID: id,
          CHILD: realChildren.map((child) => {
            if (typeof child === 'object') {
              return child
            }
            return t.stringLiteral(child)
          })
        }))
      }

      return id
    }

    result.push(t.returnStatement(root))

    return t.callExpression(
      t.functionExpression(null, [], t.blockStatement(result)),
      []
    )
  }

  return {
    visitor: {
      Program: {
        enter (path, state) {
          state.file.yoyoVariables = []
        },
        exit (path, state) {
          if (state.file.appendChildId) {
            const appendChildModule = 'yo-yoify/lib/appendChild'
            path.unshiftContainer('body', importAppendChild({
              ID: state.file.appendChildId,
              PATH: t.stringLiteral(appendChildModule)
            }))
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
