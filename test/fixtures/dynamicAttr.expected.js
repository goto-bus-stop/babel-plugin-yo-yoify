var _halp,
    _setAttribute = function (el, attr, value) {
  if (!attr) return;
  if (attr === 'className') attr = 'class';
  if (attr === 'htmlFor') attr = 'for';
  if (attr.slice(0, 2) === 'on') el[attr] = value;else {
    el.setAttribute(attr, value);
  }
},
    _str,
    _lol,
    _abc;

var handler = isTouchDevice ? 'ontouchstart' : 'onmousedown';

_halp = document.createElement('div'), _halp.setAttribute('id', 'halp'), _setAttribute(_halp, handler, () => {}), _halp.textContent = '\n', _halp;

var className = 'className';
_str = document.createElement('div'), _str.setAttribute('id', 'str'), _setAttribute(_str, className, 'blub'), _str.textContent = '\n', _str;

var x = 'disabled';
_lol = document.createElement('button'), _setAttribute(_lol, x, x), _lol.setAttribute('id', 'lol'), _lol.textContent = '\n', _lol;
x = '';
_abc = document.createElement('button'), _setAttribute(_abc, x, x), _abc.setAttribute('id', 'abc'), _abc;
