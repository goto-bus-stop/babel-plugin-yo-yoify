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

## Options

 - `useImport` - Set to true to use `import` statements for injected modules.
   By default, `require` is used. Enable this if you're using Rollup.

## License

[ISC][]

[yo-yoify]: https://github.com/shama/yo-yoify
[yo-yo]: https://github.com/maxogden/yo-yo
[bel]: https://github.com/shama/bel
[ISC]: ./LICENSE
