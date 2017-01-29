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

module.exports = ({ types: t }) => {
  const belModuleNames = ['bel', 'yo-yo', 'choo', 'choo/html']

  /**
   * Transform a template literal into raw DOM calls.
   */
  const yoyoify = (path, state) => {
    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions

    const result = [];
    const root = hyperx(transform).apply(null, [quasis].concat(expressions))

    function getAppendChildId () {
      if (!state.file.appendChildId) {
        state.file.appendChildId = path.scope.generateUidIdentifier('appendChild')
      }
      return state.file.appendChildId
    }

    function transform (tag, props, children) {
      const id = path.scope.generateUidIdentifier('bel')
      result.push(simpleTag({
        ID: id,
        TAG: t.stringLiteral(tag)
      }))

      Object.keys(props).forEach((propName) => {
        result.push(setAttribute({
          ID: id,
          ATTRIBUTE: t.stringLiteral(propName),
          VALUE: t.stringLiteral(props[propName])
        }))
      })

      if (!Array.isArray(children)) {
        return id
      }

      if (children.length === 1 && typeof children[0] === 'string') {
        // Plain strings can be added as textContent straight away.
        result.push(setTextContent({
          ID: id,
          CONTENT: t.stringLiteral(children[0])
        }))
      } else {
        result.push(appendChild({
          APPEND: getAppendChildId(),
          ID: id,
          CHILD: children.map((child) => {
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
            path.unshiftContainer('body', importAppendChild({
              ID: state.file.appendChildId,
              PATH: t.stringLiteral(require.resolve('yo-yoify/lib/appendChild'))
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
