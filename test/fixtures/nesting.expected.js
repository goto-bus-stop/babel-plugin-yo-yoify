var _appendChild = require('yo-yoify/lib/appendChild');

(function () {
  var _b = document.createElement('div');

  _b.setAttribute('class', 'b');

  _b.textContent = '\n  ';

  var _a = document.createElement('div');

  _a.setAttribute('class', 'a');

  _appendChild(_a, ['\n    ', _b, '\n']);

  return _a;
})();
