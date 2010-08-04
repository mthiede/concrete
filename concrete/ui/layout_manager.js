Concrete.UI.LayoutManager = Class.create({

  initialize: function() {
    this._createDomElements();
    this.main = $('ct_layout_main');
    this.sidebar = $('ct_layout_sidebar');
    this.toolbar = $('ct_layout_toolbar');
    this._sidebarDrag = $('ct_layout_sidebar_drag');
    this._sidebarWidth = 200;
  },

  _createDomElements: function() {
    if ($('ct_layout_main')) return;
    Element.insert($$('body').first(), { bottom: 
      "<div id='ct_layout_main' style='position: absolute; padding: 0; margin: 0; overflow: auto'></div>" +
      "<div id='ct_layout_sidebar' style='position: absolute; padding: 0; margin: 0; overflow: auto'></div>" +
      "<div id='ct_layout_sidebar_drag' style='position: absolute; padding: 0; margin: 0; width: 4px; cursor: e-resize'></div>" +
      "<div id='ct_layout_toolbar' style='position: absolute; padding: 0; margin: 0'></div>" 
    });
  },

  handleEvent: function(event) {
    if (event.type == "mousedown") {
      if (Event.element(event) == this._sidebarDrag) {
        this._dragging = true;
        event.stop();
        return true;
      }
    }
    else if (event.type == "mouseup") {
      this._dragging = false;
    }
    else if (event.type == "mousemove") {
      if (this._dragging) {
        this._sidebarWidth = Event.pointerX(event);
        this.layout();
        event.stop();
        return true;
      }
    }
  },

  layout: function() {
    var tb = this.toolbar; 
    var sb = this.sidebar;
    var sbd = this._sidebarDrag; 
    var main = this.main; 
    tb.setStyle({left: 0, top: 0, width: window.innerWidth+'px'});
    sb.setStyle({left: 0, top: tb.getHeight()+'px', width: this._sidebarWidth+'px', height: window.innerHeight-tb.getHeight()+'px'});
    sbd.setStyle({left: sb.getWidth()+'px', top: tb.getHeight()+'px', height: window.innerHeight-tb.getHeight()+'px'});
    main.setStyle({left: sb.getWidth()+sbd.getWidth()+'px', top: tb.getHeight()+'px', width: window.innerWidth-sb.getWidth()-sbd.getWidth()+'px', height: window.innerHeight-tb.getHeight()+'px'});
  }

});
