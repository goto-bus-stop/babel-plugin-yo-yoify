var _halp,
    _setAttribute = function (el, attr, value) {
  if (attr === 'className') attr = 'class';
  if (attr === 'htmlFor') attr = 'for';
  if (attr.slice(0, 2) === 'on') el[attr] = value;else {
    el.setAttribute(attr, value);
  }
},
    _str;

var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown';

_halp = document.createElement('div'), _halp.setAttribute('id', 'halp'), _setAttribute(_halp, handler, () => {}), _halp.textContent = '\n', _halp;

var className = 'className';
_str = document.createElement('div'), _str.setAttribute('id', 'str'), _setAttribute(_str, className, 'blub'), _str.textContent = '\n', _str;