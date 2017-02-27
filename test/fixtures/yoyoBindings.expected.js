var _a, _b, _c;

const yo = require('yo-yo');
const notYoYo = require('not-yo-yo');

import unrelated from 'choo/html';

// Require() call
_a = document.createElement('a'), _a;
// Should not be converted
notYoYo`<hello world />`;
// import with a standard `bel` name
_b = document.createElement('b'), _b;
// import with a completely different name
_c = document.createElement('c'), _c;