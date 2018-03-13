'use strict'

const camelCase = require('camel-case')
const hyperx = require('hyperx')
const issvg = require('@f/is-svg')
const svgNamespace = require('@f/svg-namespace')
const normalizeWhitespace = require('normalize-html-whitespace')
const isBooleanAttr = require('is-boolean-attribute')

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

/**
 * Remove a binding and its import or require() call from the file.
 */
function removeBindingImport (binding) {
  const path = binding.path
  if (path.parentPath.isImportDeclaration() &&
      // Remove the entire Import if this is the only imported binding.
      path.parentPath.node.specifiers.length === 1) {
    path.parentPath.remove()
  } else {
    path.remove()
  }
}

module.exports = (babel) => {
  const t = babel.types
  const belModuleNames = ['bel', 'yo-yo', 'choo', 'choo/html', 'nanohtml']

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
   * Returns a node that creates a comment.
   */
  const createComment = (text) =>
    t.callExpression(
      t.memberExpression(t.identifier('document'), t.identifier('createComment')),
      [t.stringLiteral(text)]
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
   * Returns a node that sets a boolean DOM attribute.
   */
  const setBooleanAttribute = (id, attr, value) =>
    t.logicalExpression('&&', value,
      setDomAttribute(id, attr, t.stringLiteral(attr)))

  /**
   * Returns a node that appends children to an element.
   */
  const appendChild = (appendChildId, id, children) =>
    t.callExpression(
      appendChildId,
      [id, t.arrayExpression(children)]
    )

  const appendTextNode = (id, text) =>
    t.callExpression(
      t.memberExpression(id, t.identifier('appendChild')),
      [t.callExpression(
        t.memberExpression(t.identifier('document'), t.identifier('createTextNode')),
        [text]
      )]
    )

  const addDynamicAttribute = (helperId, id, attr, value) =>
    t.callExpression(helperId, [id, attr, value])

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

  const isEmptyTemplateLiteral = (node) => {
    return t.isTemplateLiteral(node) &&
      node.expressions.length === 0 &&
      node.quasis.length === 1 &&
      t.isTemplateElement(node.quasis[0]) &&
      node.quasis[0].value.raw === ''
  }

  /**
   * Transform a template literal into raw DOM calls.
   */
  const yoyoify = (path, state) => {
    if (isEmptyTemplateLiteral(path.node)) {
      return t.unaryExpression('void', t.numericLiteral(0))
    }

    const quasis = path.node.quasis.map((quasi) => quasi.value.cooked)
    const expressions = path.node.expressions
    const expressionPlaceholders = expressions.map((expr, i) => getPlaceholder(i))

    const root = hyperx(transform, { comments: true }).apply(null,
      [quasis].concat(expressionPlaceholders))

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
      if (tag === '!--') {
        return createComment(props.comment)
      }

      const id = path.scope.generateUidIdentifier(getElementName(props, tag))
      path.scope.push({ id })

      const result = []

      // Use the SVG namespace for svg elements.
      if (issvg(tag)) {
        state.svgNamespaceId.used = true
        result.push(t.assignmentExpression('=', id, createNsElement(state.svgNamespaceId, tag)))
      } else {
        result.push(t.assignmentExpression('=', id, createElement(tag)))
      }

      Object.keys(props).forEach((propName) => {
        const dynamicPropName = convertPlaceholders(propName).filter(isNotEmptyString)
        // Just use the normal propName if there are no placeholders
        if (dynamicPropName.length === 1 && t.isStringLiteral(dynamicPropName[0])) {
          propName = dynamicPropName[0].value
        } else {
          state.setAttributeId.used = true
          result.push(addDynamicAttribute(state.setAttributeId, id, dynamicPropName.reduce(concatAttribute),
            convertPlaceholders(props[propName]).filter(isNotEmptyString).reduce(concatAttribute)))
          return
        }

        // don’t convert to lowercase, since some attributes are case-sensetive
        let attrName = propName

        if (attrName === 'className') {
          attrName = 'class'
        }

        if (attrName === 'htmlFor') {
          attrName = 'for'
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

        // Dynamic boolean attributes
        if (isBooleanAttr(attrName) && props[propName] !== attrName) {
          // if (xyz) abc.setAttribute('disabled', 'disabled')
          result.push(setBooleanAttribute(id, attrName,
            convertPlaceholders(props[propName])
              .filter(isNotEmptyString)[0]))
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
          // Remove unnecessary whitespace from other strings
          .map((child) => {
            if (t.isStringLiteral(child)) {
              child.value = normalizeWhitespace(child.value)
            }
            return child
          })

        if (realChildren.length === 1 && t.isStringLiteral(realChildren[0])) {
          // A single string child doesn't need to call the `appendChild` helper
          // but can just append a new TextNode.
          result.push(appendTextNode(id, realChildren[0]))
        } else if (realChildren.length > 0) {
          state.appendChildId.used = true
          result.push(appendChild(state.appendChildId, id, realChildren))
        }
      }

      result.push(id)
      return t.sequenceExpression(result)
    }

    return root
  }

  function isYoyoRequireCall (node) {
    if (!t.isIdentifier(node.callee, { name: 'require' })) {
      return false
    }
    const firstArg = node.arguments[0]
    // Not a `require('module')` call
    if (!firstArg || !t.isStringLiteral(firstArg)) {
      return false
    }

    const importFrom = firstArg.value
    return belModuleNames.indexOf(importFrom) !== -1
  }

  return {
    pre () {
      this.yoyoBindings = new Set()
    },
    post () {
      this.yoyoBindings.clear()
    },

    visitor: {
      Program: {
        enter (path) {
          this.appendChildId = path.scope.generateUidIdentifier('appendChild')
          this.setAttributeId = path.scope.generateUidIdentifier('setAttribute')
          this.svgNamespaceId = path.scope.generateUidIdentifier('svgNamespace')
        },
        exit (path, state) {
          const appendChildModule = this.opts.appendChildModule || 'yo-yoify/lib/appendChild'
          const setAttributeModule = this.opts.setAttributeModule || 'yo-yoify/lib/setAttribute'
          const useImport = this.opts.useImport

          if (this.appendChildId.used) {
            addImport(this.appendChildId, appendChildModule)
          }
          if (this.setAttributeId.used) {
            addImport(this.setAttributeId, setAttributeModule)
          }
          if (this.svgNamespaceId.used) {
            path.scope.push({
              id: this.svgNamespaceId,
              init: t.stringLiteral(svgNamespace)
            })
          }

          function addImport (id, source) {
            if (useImport) {
              path.unshiftContainer('body', t.importDeclaration([
                t.importDefaultSpecifier(id)
              ], t.stringLiteral(source)))
            } else {
              path.scope.push({
                id: id,
                init: t.callExpression(t.identifier('require'), [t.stringLiteral(source)])
              })
            }
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
            this.yoyoBindings.add(path.scope.getBinding(specifier.node.local.name))
          }
        }
      },

      CallExpression (path, state) {
        if (isYoyoRequireCall(path.node)) {
          // Not a `thing = require(...)` declaration
          if (!path.parentPath.isVariableDeclarator()) return

          this.yoyoBindings.add(path.parentPath.scope.getBinding(path.parentPath.node.id.name))
        }
      },

      TaggedTemplateExpression (path, state) {
        const tag = path.get('tag')
        const binding = tag.isIdentifier()
          ? path.scope.getBinding(tag.node.name)
          : null

        const isYoyoBinding = binding ? this.yoyoBindings.has(binding) : false
        if (isYoyoBinding || isYoyoRequireCall(tag.node)) {
          let newPath = yoyoify(path.get('quasi'), state)
          // If this template string is the only expression inside an arrow
          // function, the `yoyoify` call may have introduced new variables
          // inside its scope and forced it to become an arrow function with
          // a block body. In that case if we replace the old `path`, it
          // doesn't do anything. Instead we need to find the newly introduced
          // `return` statement.
          if (path.parentPath.isArrowFunctionExpression()) {
            const statements = path.parentPath.get('body.body')
            if (statements) {
              path = statements.find((st) => st.isReturnStatement())
            }
          }
          path.replaceWith(newPath)

          // Remove the import or require() for the tag if it's no longer used
          // anywhere.
          if (binding) {
            binding.dereference()
            if (!binding.referenced) {
              removeBindingImport(binding)
            }
          }
        }
      }
    }
  }
}
