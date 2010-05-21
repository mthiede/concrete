Concrete.UI.ProceedDialog = Class.create(Concrete.UI.AbstractDialog, {

  initialize: function($super, options) {
    options = options || {};
    this.title = options.title || "Proceed?";
    this.message = options.message || "Proceed?";
    this.proceedButtonText = options.proceedButtonText || "Proceed";
    var dialogElement = this._createDomElement();
    $super(dialogElement, options);
  },

  _createDomElement: function() {
    if ($('ct_proceed_dialog')) return $('ct_proceed_dialog');
    Element.insert($$('body').first(), { bottom: 
    "<div id='ct_proceed_dialog' class='popup_dialog' style='display: none; position: fixed; z-index: 1000'>" +
      "<div class='shadow'></div>" +
      "<div class='dialog_box'>" +
      "<div class='title_bar'>" + this.title +
        "<a class='close_button'></a>" +
      "</div>" +
      "<div class='container'>" +
        "<p class='label'>"+this.message+"</p>" +
        "<div style='text-align: center; margin: 10px'>" +
          "<input class='button_input proceed_button' type='button' value='"+this.proceedButtonText+"' />" +
          "<input class='button_input cancel_button' type='button' value='Cancel' />" +
        "</div>" +
      "</div>" +
      "</div>" +
    "</div>" }); 
    return $('ct_proceed_dialog');
  },

  _proceed: function() {
    if (this._onProceed) {
      this._onProceed();
    }
  },

  _buttonPressed: function(element) {
    if (element == this.dialogElement.down(".cancel_button")) {
      this.close();
    }
  },

  open: function($super, options) {
    $super();
    this._onProceed = options.onProceed;
  },

});


