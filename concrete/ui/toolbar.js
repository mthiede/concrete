Concrete.UI.Toolbar = Class.create({

  initialize: function(parentElement) {
    this.toolbar = this._createDomElement(parentElement);
    this.popup = this.toolbar.down(".ct_tooltip_popup");
    this.hotkeys = new Hash();
    this.tooltips = {};
  },

  handleEvent: function(event) {
    var handeled = false;
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
            handeled = true;
            throw $break;
          }
        }
      }, this);
    }
    else if (event.type == "mousemove") {
      var element = Event.element(event);
      this.popup.hide();
      if (element.hasClassName("ct_toolbar_icon")) {
        var clazz = element.className.sub("ct_toolbar_icon ","");
        var tooltip = this.tooltips[clazz];
        if (tooltip && tooltip.length > 0) {
          this.popup.innerHTML = tooltip;
          var left = event.clientX+20;
          if (left > document.viewport.getDimensions().width - this.popup.getWidth()) {
            left = document.viewport.getDimensions().width - this.popup.getWidth();
          }
          this.popup.setStyle({left: left+'px', top: event.clientY+20+'px'});
          this.popup.show();
        }
      }
    }
    return handeled;
  },

  addCommand: function(options, func) {
    if (options.hotkey) {
      this.hotkeys.set(options.hotkey, func);
    }
    var clazz = options.buttonClass || "";
    if (options.tooltip && clazz.length > 0) {
      this.tooltips[clazz] = options.tooltip;
    }
    Element.insert(this.toolbar, { bottom:
      "<a class='ct_toolbar_icon "+clazz+"'></a>"
    });
    var icon = this.toolbar.childElements().last();
    icon.onclick = func;
  },

  _createDomElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div class='ct_toolbar'>" +
        "<div style='position: fixed; display: none; left: 0; top: 0;' class='ct_tooltip_popup'></div>" +
      "</div>"
    });
    return parentElement.childElements().last();
  },

});
