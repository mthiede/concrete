// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.BasicInlineEditor = Class.create({

  show: function(element, initialText, partial, completionOptions) {
    if (this.element) {
      // edit still in progress, cancel
      this.hide();
    }
    this.element = element;
    if (element.parentNode.tagName.toUpperCase() == "TBODY") {
      cols = element.up("table").select("tr").max(function(r) { return r.childElements().select(function(c) {return c.tagName.toUpperCase() == "TD";}).size(); });
      Element.insert(element, { after: 
        "<tr><td colspan='"+cols+"'>" +
        "<div class='ct_inline_editor' style='display: inline'>" +
          "<input type='text' size='"+initialText.length+"' value='"+initialText+"'/>" +
          "<div style='display: none; position: absolute;	border: 1px solid grey; background-color: white;'></div>" + 
        "</div>" +
        "</td></tr>"
      });
      input = element.next().down().down().down();
    }
    else {
      Element.insert(element, { after: 
        "<div class='ct_inline_editor' style='display: inline'>" +
          "<input type='text' size='"+initialText.length+"' value='"+initialText+"'/>" +
          "<div style='display: none; position: absolute;	border: 1px solid grey; background-color: white;'></div>" + 
        "</div>"
      });
      input = element.next().down();
    }
    element.hide();
    this.input = input;
    input.select();
    this._interval = window.setInterval(function() { 
      // set size one larger than the text, otherwise the first char is shifted out left when new chars are added at the right
      input.size = input.value.length + 1;
    }, 50);
    new Autocompleter.Local(input, input.next(), completionOptions, {partialSearch: partial, fullSearch: partial, minChars: 0, partialChars: 0, onShow:
      function(element, update){
        if(!update.style.position || update.style.position=='absolute') {
          update.style.position = 'absolute';
          Position.clone(element, update, {
            setHeight: false,
            setWidth: false, // in contrast to the original built-in default, do not set width
            offsetTop: element.offsetHeight
          });
        }
        Effect.Appear(update,{duration:0.15});
      }
    });
  },

  getText: function() {
    return this.input.value;
  },

  setError: function() {
    this.element.next().addClassName("ct_error");
  },

  hide: function() {
    if (this._interval) window.clearInterval(this._interval);
    this.element.show();
    this.element.next().remove();
    this.element = undefined;
  }

});
