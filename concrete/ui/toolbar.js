Concrete.UI.Toolbar = Class.create({

  initialize: function(parentElement) {
    this.toolbar = this._createDomElement(parentElement);
    this.hotkeys = new Hash();
  },

  handleEvent: function(event) {
    if (event.type == "keydown") {
      this.hotkeys.keys().each(function(k) {
        var match = k.match(/^(ctrl\+)?(shift\+)?(\w)$/);
        if (match) {
          var ctrl = match[1];
          var shift = match[2];
          var keyCode = match[3].charCodeAt(0);
          if ((shift && event.shiftKey || !shift && !event.shiftKey) &&
            (ctrl && event.ctrlKey || !ctrl && !event.ctrlKey) &&
            keyCode == event.keyCode) {
            this.hotkeys.get(k)();
            event.stop();
            return true;
          }
        }
      }, this);
    }
  },

  addCommand: function(options, func) {
    if (options.hotkey) {
      this.hotkeys.set(options.hotkey, func);
    }
    var clazz = options.buttonClass || "";
    Element.insert(this.toolbar, { bottom:
      "<a class='ct_toolbar_icon "+clazz+"'></a>"
    });
    var icon = this.toolbar.childElements().last();
    icon.onclick = func;
  },

  _createDomElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div class='ct_toolbar'></div>"
    });
    return parentElement.childElements().last();
  },

});
