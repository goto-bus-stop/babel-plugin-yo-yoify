var _appendChild = require('yo-yoify/lib/appendChild');

class Component {
  constructor() {
    this.value = 10;
  }
  render() {
    var _this = this;

    return function () {
      var _span = document.createElement('span');

      _appendChild(_span, [_this.value]);

      return _span;
    }();
  }
}
