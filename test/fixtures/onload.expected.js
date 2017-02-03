var _div,
    _onload = require('on-load'),
    _div2,
    _div3;

const onload = (_div = document.createElement('div'), _onload(_div, onloadHandler, null), _div.textContent = '\n', _div);

const onunload = (_div2 = document.createElement('div'), _onload(_div2, null, () => {
  alert('Bye');
}), _div2.textContent = '\n', _div2);

const both = (_div3 = document.createElement('div'), _onload(_div3, () => console.log('loaded'), () => console.log('unloaded')), _div3.textContent = '\n', _div3);
