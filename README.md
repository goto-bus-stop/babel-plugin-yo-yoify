# DEPRECATED

This plugin was merged with [nanohtml](https://github.com/choojs/nanohtml).
Please use that instead!

```js
// .babelrc
{
  "plugins": ["nanohtml"]
}
```

# babel-plugin-yo-yoify

Like [yo-yoify][], but as a Babel plugin. Transform [yo-yo][] or [bel][]
template strings into raw document calls.

## Installation

```bash
npm install --save-dev babel-plugin-yo-yoify
# And:
npm install --save yo-yoify
```

`yo-yoify` is used in the compiled output of `babel-plugin-yo-yoify`, so it must
be installed next to it.

## Example

Using `babel --plugins yo-yoify | prettier --stdin`:

**In**

```js
import html from 'bel'

const title = 'yo-yoify'
const header = html`
  <header id="page-header">
    <h1>${title}</h1>
    <button onclick=${event => alert('Hello world!')}>Click here</button>
  </header>
`
```

**Out**

```js
var _h, _button, _pageHeader;

var _appendChild = require('yo-yoify/lib/appendChild');

const title = 'yo-yoify';
const header = (_pageHeader = document.createElement(
  'header'
), _pageHeader.setAttribute('id', 'page-header'), _appendChild(_pageHeader, [
  '\n    ',
  (_h = document.createElement('h1'), _appendChild(_h, [title]), _h),
  '\n    ',
  (_button = document.createElement('button'), _button.onclick = event =>
    alert('Hello world!'), _button.textContent = 'Click here', _button),
  '\n  '
]), _pageHeader);
```

## Usage

Without options:

```js
// .babelrc
{
  "plugins": [
    "yo-yoify"
  ]
}
```

With options:

```js
// .babelrc
{
  "plugins": [
    ["yo-yoify", {
      "useImport": true
    }]
  ]
}
```

### bel v5

When used with `bel` v5.1.3 or up, it's recommended to tell
babel-plugin-yo-yoify to use bel's exported `appendChild` function. This way,
the transformed output will always use the same appending and white space
handling logic as the original source.

```js
{
  "plugins": [
    ["yo-yoify", {
      "appendChildModule": "bel/appendChild"
    }]
  ]
}
```

bel versions v5.1.2 and below do not export the `appendChild` function--for
those, the default `"yo-yoify/lib/appendChild"` function is used instead. This
function may have different behaviour from the bel version being used, though.

## Options

 - `useImport` - Set to true to use `import` statements for injected modules.
   By default, `require` is used. Enable this if you're using Rollup.
 - `appendChildModule` - Import path to a module that contains an `appendChild`
   function. Set this to `"bel/appendChild"` when using bel v5.1.3 or up!
   Defaults to `"yo-yoify/lib/appendChild"`.

## License

[ISC][]

[yo-yoify]: https://github.com/shama/yo-yoify
[yo-yo]: https://github.com/maxogden/yo-yo
[bel]: https://github.com/shama/bel
[ISC]: ./LICENSE
