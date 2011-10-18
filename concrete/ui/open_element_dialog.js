Concrete.UI.OpenElementDialog = Class.create(Concrete.UI.AbstractDialog, {

  initialize: function($super, extIdentProvider, options) {
    var dialogElement = this._createDomElement();
    $super(dialogElement, options);
    this.input = dialogElement.down(".search_box_input");
    this.extIdentProvider = extIdentProvider;
    this.completer = this._createAutoCompleter();
  },

  _createDomElement: function() {
    if ($('ct_open_element_dialog')) return $('ct_open_element_dialog');
    Element.insert($$('body').first(), { bottom: 
      "<div id='ct_open_element_dialog' class='popup_dialog' style='display: none; position: fixed; z-index: 1000'>" +
        "<div class='shadow'></div>" +
        "<div class='dialog_box'>" +
        "<div class='title_bar'>" +
          "Open Element" +
          "<a class='close_button'></a>" +
        "</div>" +
        "<div class='container'>" +
          "<p class='label'>Element name</p>" +
          "<input class='text_input search_box_input' type='text' spellcheck='false'/>" +
          "<div class='search_box_list_container'>" +
            "<div class='search_box_list auto_complete_dropdown' style='position: relative'>" +
            "</div> " +
          "</div> " +
          "<div style='text-align: center; margin: 10px'>" +
            "<input class='button_input proceed_button' type='button' value='Open' />" +
          "</div>" +
        "</div> " +
        "</div> " +
      "</div>" 
    });
    return $('ct_open_element_dialog');
  },

  _createAutoCompleter: function() {
    var completer = new Autocompleter.Local(
      this.input, 
      this.dialogElement.down(".search_box_list"),
      [],
      { partialSearch: true, fullSearch: true, minChars: 0, partialChars: 0, choices: 100, 
      selector: function(completer) {
        var result = [];
        var entry = completer.getToken();

        for (var i = 0; i < completer.options.array.length &&
          result.length < completer.options.choices ; i++) {

          var ei = completer.options.array[i];
          var identifier = ei.identifier;
          var foundPos = completer.options.ignoreCase ?
            identifier.toLowerCase().indexOf(entry.toLowerCase()) :
            identifier.indexOf(entry);

          if (foundPos != -1) {
            result.push("<li><span class='search_box_identifier'>"+
            identifier.substr(0, foundPos) + 
            "<strong>" + identifier.substr(foundPos, entry.length) + "</strong>" +
            identifier.substr(foundPos + entry.length) +
            "</span><span class='informal search_box_class_name'> ["+ei.type+"]</span><br />"+
            "<span class='search_box_module_name'> "+ei.module+"</span>"+
            "</li>");
          }
        }
        return "<ul>" + result.join('') + "</ul>";
      }});
    return completer;
  },

  _proceed: function() {
    if (this.options.onOpenReference) {
      var value = this.input.value;
      var splitIndex = value.indexOf(" ");
      var ident = value.substr(0, splitIndex); 
      var module = value.substr(splitIndex+1, value.length-splitIndex-1); 
      this.options.onOpenReference(module, ident);
    }
  },

  open: function($super, eis) {
    $super();
    this.input.value = "";
    this.completer.options.array = eis;
  },

});

