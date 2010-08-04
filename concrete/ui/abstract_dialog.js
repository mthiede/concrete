Concrete.UI.AbstractDialog = Class.create({

  initialize: function(dialogElement, options) {
    this.dialogElement = dialogElement;
    this.options = options || {};
    this.proceedButton = dialogElement.down(".proceed_button");
    this.active = false;
    this.moving = false;
    Event.observe(window, 'mouseup', function(event) {
      this.moving = false;
    }.bind(this));
    Event.observe(window, 'mousedown', function(event) {
      var element = Event.element(event);
      if (element == this.dialogElement.down(".title_bar")) {
        this.moving = true;
        var offset = this.dialogElement.cumulativeOffset();
        this.moveOffset = {left: event.clientX-offset.left, top: event.clientY-offset.top};
        event.stop();
      }
    }.bind(this));
    Event.observe(window, 'mousemove', function(event) {
      if (this.moving) {
        this.dialogElement.setStyle({left: event.clientX-this.moveOffset.left+'px', top: event.clientY-this.moveOffset.top+'px'});
      }
    }.bind(this));
    Event.observe(window, 'click', function(event) {
      if (this.active) {
        var element = Event.element(event);
        if (element == this.dialogElement.down(".close_button")) {
          this.close();
        }
        else if (this.proceedButton && element == this.proceedButton) {
          this.close();
          this._proceed();
        }
        else if (element.ancestors().include(this.dialogElement) && element.hasClassName("button_input")) {
          this._buttonPressed(element);
        }
      }
    }.bind(this));
    Event.observe(window, 'keydown', function(event) {
      if (this.active) {
        if (event.keyCode == 27) { // esc
          this.close();
          event.stop();				
        }
        else if (event.keyCode == 13 && this.proceedButton) { // return
          this.close();
          this._proceed();
          event.stop();
        }
      }
    }.bind(this));
  },

  _proceed: function() {
    // override in subclass
  },

  _buttonPressed: function(element) {
    // override in subclass
  },

  open: function() {
    this.dialogElement.setStyle({left: (window.innerWidth-this.dialogElement.getWidth())/2+'px', top: (window.innerHeight-this.dialogElement.getHeight())/2+'px'});
    this.dialogElement.down(".shadow").setStyle({width: this.dialogElement.getWidth()+10+'px', height: this.dialogElement.getHeight()+10+'px'});
    this.dialogElement.show();
    this.dialogElement.down("input").select();
    this.active = true;
  },

  close: function() {
    this.dialogElement.hide();
    this.active = false;
  }

});



