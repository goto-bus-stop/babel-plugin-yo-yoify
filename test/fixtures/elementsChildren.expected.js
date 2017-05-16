var _h,
    _header,
    _appendChild = require('yo-yoify/lib/appendChild');

const child = (_h = document.createElement('h1'), _h.appendChild(document.createTextNode('Page header')), _h);

const header = (_header = document.createElement('header'), _appendChild(_header, [child]), _header);