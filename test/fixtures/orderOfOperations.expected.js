var _p,
    _appendChild = require('yo-yoify/lib/appendChild'),
    _div;

let i = 0;

const counter = (_div = document.createElement('div'), _appendChild(_div, [' ', i++, ' ', (_p = document.createElement('p'), _appendChild(_p, [i++]), _p), ' ', i++, ' ']), _div);
