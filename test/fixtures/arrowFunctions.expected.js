var _appendChild = require('yo-yoify/lib/appendChild');

const component = () => {
  var _h, _div;

  _div = document.createElement('div'), _appendChild(_div, [' ', (_h = document.createElement('h1'), _h.appendChild(document.createTextNode(' hello world ')), _h), ' ', list.map(x => {
    var _span;

    _span = document.createElement('span'), _span.setAttribute('style', 'background-color: red; margin: 10px;'), _appendChild(_span, [' ', x, ' ']), _span;
  }), ' ']), _div;
}; // https://github.com/goto-bus-stop/babel-plugin-yo-yoify/issues/14