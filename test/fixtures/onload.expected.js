var _onload = require('on-load');

const onload = function () {
  var _div = document.createElement('div');

  _onload(_div, onloadHandler, null);

  _div.textContent = '\n';
  return _div;
}();

const onunload = function () {
  var _div2 = document.createElement('div');

  _onload(_div2, null, () => {
    alert('Bye');
  });

  _div2.textContent = '\n';
  return _div2;
}();

const both = function () {
  var _div3 = document.createElement('div');

  _onload(_div3, () => console.log('loaded'), () => console.log('unloaded'));

  _div3.textContent = '\n';
  return _div3;
}();
