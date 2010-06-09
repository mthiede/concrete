Concrete.UI.PreferencesDialog = Class.create(Concrete.UI.AbstractDialog, {

  initialize: function($super, options) {
    options = options || {};
    var dialogElement = this._createDomElement();
    $super(dialogElement, options);
    this.syntaxInput = dialogElement.down(".syntax_input");
  },

  _createDomElement: function() {
    if ($('ct_preferences_dialog')) return $('ct_preferences_dialog');
    Element.insert($$('body').first(), { bottom: 
    "<div id='ct_preferences_dialog' class='popup_dialog' style='display: none; position: fixed; z-index: 1000'>" +
      "<div class='shadow'></div>" +
      "<div class='dialog_box'>" +
      "<div class='title_bar'>Preferences" +
        "<a class='close_button'></a>" +
      "</div>" +
      "<div class='container'>" +
        "<p class='label'>Concrete Syntax</p>" +
        "<select class='dropdown_input syntax_input'>" + 
        "</select>" + 
        "<p>Save your work and press 'reload' to make changes visible.</p>" +
        "<div style='text-align: center; margin: 10px'>" +
          "<input class='button_input proceed_button' type='button' value='OK' />" +
          "<input class='button_input cancel_button' type='button' value='Cancel' />" +
        "</div>" +
      "</div>" +
      "</div>" +
    "</div>" }); 
    return $('ct_preferences_dialog');
  },

  _proceed: function() {
    new Ajax.Request("/setConcreteSyntax", {
      method: 'get',
      parameters: {"ident": this.syntaxInput.value},
      onSuccess: function(transport) {
      },
      onFailure: function() {
      }
    });
  },

  _buttonPressed: function(element) {
    if (element == this.dialogElement.down(".cancel_button")) {
      this.close();
    }
  },

  open: function($super, options) {
    $super();
    new Ajax.Request("/concreteSyntaxes", {
      method: 'get',
      onSuccess: function(transport) {
        if (transport.responseText.isJSON()) {
          var synDesc = transport.responseText.evalJSON();
          Element.replace(this.syntaxInput, 
            "<select class='dropdown_input syntax_input'>" +
            synDesc.syntaxes.collect(function(s) {
              var selected = (s.ident == synDesc.selected) ? "selected" : "";
              return "<option "+selected+" value=\""+s.ident+"\">"+s.name+"</option>";
            }).join("") +
            "</select>"
          );
          this.syntaxInput = this.dialogElement.down(".syntax_input");
        }
      }.bind(this),
    });
  }

});



