'use strict'

const camelCase = require('camel-case')
const hyperx = require('hyperx')
const issvg = require('@f/is-svg')
const svgNamespace = require('@f/svg-namespace')

/**
 * Try to return a nice variable name for an element based on its HTML id,
 * classname, or tagname.
 */
function getElementName (props, tag) {
  if (typeof props.id === 'string' && !placeholderRe.test(props.id)) {
    return camelCase(props.id)
  }
  if (typeof props.className === 'string' && !placeholderRe.test(props.className)) {
    return camelCase(props.className.split(' ')[0])
  }
  return tag || 'bel'
}

/**
 * Regex for detecting placeholders.
 */
const placeholderRe = /\0(\d+)\0/g

/**
 * Get a placeholder string for a numeric ID.
 */
const getPlaceholder = (i) => `\0${i}\0`

module.exports = (babel) => {
  const t = babel.types
  const belModuleNames = ['bel', 'yo-yo', 'choo', 'choo/html']

  // Unique ID for `on-load` calls, so it can recognise elements.
  let onloadIndex = 1

  /**
   * Returns a node that creates a namespaced HTML element.
   */
  const createNsElement = (ns, tag) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElementNS')),
      [ns, t.stringLiteral(tag)]
    )

  /**
   * Returns a node that creates an element.
  */
  const createElement = (tag) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createElement')),
      [t.stringLiteral(tag)]
    )

  /**
   * Returns a node that sets a DOM property.
   */
  const setDomProperty = (id, prop, value) =>
    t.assignmentExpression('=',
      t.memberExpression(id, t.identifier(prop)),
      value)

  /**
   * Returns a node that sets a DOM attribute.
   */
  const setDomAttribute = (id, attr, value) =>
    t.callExpression(
      t.memberExpression(id, t.identifier('setAttribute')),
      [t.stringLiteral(attr), value])

  /**
   * Returns a node that appends children to an element.
   */
  const appendChild = (appendChildId, id, children) =>
    t.callExpression(
      appendChildId,
      [id, t.arrayExpression(children)]
    )

  const addedRequires = Symbol('added requires')
  /**
   * Add a require call to a file, returning the variable name it's bound to.
   * Can safely be called with the same module name multiple times in a single
   * file.
   */
  const addRequire = (file, module, name) => {
    if (!file[addedRequires]) {
      file[addedRequires] = {}
    }
    if (!file[addedRequires][module]) {
      const id = file.scope.generateUidIdentifier(name)
      file[addedRequires][module] = id
      file.scope.push({
        id,
        init: t.callExpression(t.identifier('require'), [t.stringLiteral(module)])
      })
    }
    return file[addedRequires][module]
  }

  const addedVariables = Symbol('added variables')
  /**
   * Like addRequire, but adds a variable with a constant value instead of a
   * require() call.
   */
  const addVariable = (file, name, value) => {
    if (!file[addedVariables]) {
      file[addedVariables] = {}
    }
    if (!file[addedVariables][name]) {
      const id = file.scope.generateUidIdentifier(name)
      file[addedVariables][name] = id
      file.scope.push({ id, init: value })
    }
    return file[addedVariables][name]
  }

  /**
   * Wrap a node in a String() call if it may not be a string.
   */
  const ensureString = (node) => {
    if (t.isStringLiteral(node)) {
      return node
    }
    return t.callExpression(t.identifier('String'), [node])
  }

  /**
   * Concatenate multiple parts of an HTML attribute.
   */
  const concatAttribute = (left, right) =>
    t.binaryExpression('+', left, right)

  /**
   * Check if a node is *not* the empty string.
   * (Inverted so it can be used with `[].map` easily)
   */
  const isNotEmptyString = (node) =>
    !t.isStringLiteral(node, { value: '' })

  /**
   * Transform a template literal into raw DOM calls.
   */
  const yoyoify = (path, state) => {
    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions
    const expressionPlaceholders = expressions.map((expr, i) => getPlaceholder(i))

    const appendChildModule = state.opts.appendChildModule || 'yo-yoify/lib/appendChild'
    const onLoadModule = state.opts.onLoadModule || 'on-load'

    const root = hyperx(transform).apply(null, [quasis].concat(expressionPlaceholders))

    /**
     * Convert placeholders used in the template string back to the AST nodes
     * they reference.
     */
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

    /**
     * Transform a hyperx vdom element to an AST node that creates the element.
     */
    function transform (tag, props, children) {
      const id = path.scope.generateUidIdentifier(getElementName(props, tag))
      path.scope.push({ id })

      const result = []

      // Use the SVG namespace for svg elements.
      if (issvg(tag)) {
        const svgBinding = addVariable(state.file, 'svgNamespace', t.stringLiteral(svgNamespace))
        result.push(t.assignmentExpression('=', id, createNsElement(svgBinding, tag)))
      } else {
        result.push(t.assignmentExpression('=', id, createElement(tag)))
      }

      if (props.onload || props.onunload) {
        const onload = props.onload &&
          convertPlaceholders(props.onload).filter(isNotEmptyString)
        const onunload = props.onunload &&
          convertPlaceholders(props.onunload).filter(isNotEmptyString)

        result.push(t.callExpression(
          addRequire(state.file, onLoadModule, 'onload'), [
            id,
            onload && onload.length === 1
              ? onload[0] : t.nullLiteral(),
            onunload && onunload.length === 1
              ? onunload[0] : t.nullLiteral(),
            t.numericLiteral(onloadIndex++)
          ]
        ))
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

        // abc.onclick = xyz
        if (attrName.slice(0, 2) === 'on') {
          const value = convertPlaceholders(props[propName]).filter(isNotEmptyString)
          result.push(setDomProperty(id, attrName,
            value.length === 1
              ? value[0]
              : value.map(ensureString).reduce(concatAttribute)
          ))

          return
        }

        // abc.setAttribute('class', xyz)
        result.push(setDomAttribute(id, attrName,
          convertPlaceholders(props[propName])
            .map(ensureString)
            .reduce(concatAttribute)
        ))
      })

      if (Array.isArray(children)) {
        const realChildren = children.map(convertPlaceholders)
          // Flatten
          .reduce((flat, arr) => flat.concat(arr), [])
          // Remove empty strings since they don't affect output
          .filter(isNotEmptyString)

        if (realChildren.length === 1 && t.isStringLiteral(realChildren[0])) {
          // Plain strings can be added as textContent straight away.
          result.push(setDomProperty(id, 'textContent', realChildren[0]))
        } else if (realChildren.length > 0) {
          result.push(appendChild(
            addRequire(state.file, appendChildModule, 'appendChild'),
            id, realChildren
          ))
        }
      }

      result.push(id)
      return t.sequenceExpression(result)
    }

    return root
  }

  return {
    visitor: {
      Program: {
        enter (path, state) {
          state.file.yoyoVariables = []
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

      CallExpression (path, state) {
        if (path.get('callee').isIdentifier({ name: 'require' })) {
          const firstArg = path.node.arguments[0]
          // Not a `require('module')` call
          if (!firstArg || !t.isStringLiteral(firstArg)) return
          // Not a `thing = require(...)` declaration
          if (!path.parentPath.isVariableDeclarator()) return

          const importFrom = firstArg.value
          if (belModuleNames.indexOf(importFrom) !== -1) {
            state.file.yoyoVariables.push(path.parentPath.node.id.name)
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
