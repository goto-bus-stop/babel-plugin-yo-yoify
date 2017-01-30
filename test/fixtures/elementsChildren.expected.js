var _appendChild = require('yo-yoify/lib/appendChild');

const child = function () {
  var _h = document.createElement('h1');

  _h.textContent = 'Page header';
  return _h;
}();

const header = function () {
  var _header = document.createElement('header');

  _appendChild(_header, [child]);

  return _header;
}();
