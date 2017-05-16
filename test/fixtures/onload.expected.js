var _div,
    _onload = require('on-load'),
    _div2,
    _div3;

const onload = (_div = document.createElement('div'), _onload(_div, onloadHandler, null, 1), _div.appendChild(document.createTextNode('\n')), _div);

const onunload = (_div2 = document.createElement('div'), _onload(_div2, null, () => {
  alert('Bye');
}, 2), _div2.appendChild(document.createTextNode('\n')), _div2);

const both = (_div3 = document.createElement('div'), _onload(_div3, () => console.log('loaded'), () => console.log('unloaded'), 3), _div3.appendChild(document.createTextNode('\n')), _div3);