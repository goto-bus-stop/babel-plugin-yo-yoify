var _appendChild = require('yo-yoify/lib/appendChild');

class Component {
  constructor() {
    this.value = 10;
  }
  render() {
    var _span;

    return _span = document.createElement('span'), _appendChild(_span, [this.value]), _span;
  }
}
