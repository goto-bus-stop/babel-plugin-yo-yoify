(function () {
  var _button = document.createElement('button');

  _button.onclick = event => {
    console.log(event);
  };

  _button.textContent = '\n';
  return _button;
})();