Concrete.UI.CreateModuleDialog = Class.create(Concrete.UI.AbstractDialog, {

  initialize: function($super, options) {
    options = options || {};
    var dialogElement = this._createDomElement();
    $super(dialogElement, options);
    this.moduleNameInput = dialogElement.down(".module_name_input");
  },

  _createDomElement: function() {
    if ($('ct_create_module_dialog')) return $('ct_create_module_dialog');
    Element.insert($$('body').first(), { bottom: 
    "<div id='ct_create_module_dialog' class='popup_dialog' style='display: none; position: fixed; z-index: 1000; max-width: 400px'>" +
      "<div class='shadow'></div>" +
      "<div class='dialog_box'>" +
      "<div class='title_bar'>Create Module" +
        "<a class='close_button'></a>" +
      "</div>" +
      "<div class='container'>" +
        "<p class='label'>Relative Module Path</p>" +
        "<input type='text' class='text_input module_name_input' />" + 
        "<p>The module path is relative to the working set root directory defined at server startup time, '..' is not allowed.</p>" +
        "<div style='text-align: center; margin: 10px'>" +
          "<input class='button_input proceed_button' type='button' value='Create' />" +
          "<input class='button_input cancel_button' type='button' value='Cancel' />" +
        "</div>" +
      "</div>" +
      "</div>" +
    "</div>" }); 
    return $('ct_create_module_dialog');
  },

  _proceed: function() {
    if (this._onCreateModule) {
      this._onCreateModule(this.moduleNameInput.value);
    }
  },

  _buttonPressed: function(element) {
    if (element == this.dialogElement.down(".cancel_button")) {
      this.close();
    }
  },

  open: function($super, options) {
    $super();
    this._onCreateModule = options.onCreateModule;
    this.moduleNameInput.value = "";
  }

});




