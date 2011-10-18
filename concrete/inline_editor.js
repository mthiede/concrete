// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.InlineEditor = Class.create(Concrete.BasicInlineEditor, {

  initialize: function(stateChangeFunc) {
    this.stateChangeFunc = stateChangeFunc;
  },

  edit: function(element, opt) {
    var init = opt.init || "";
    var partial = opt.partial || false;
    if (opt.options instanceof Array) {
      this._options = opt.options;
      this._regexp = undefined;
    }
    else if (opt.options instanceof RegExp) {
      this._options = [];
      this._regexp = opt.options;
    }
    else {
      this._options = [];
      this._regexp = undefined;
    }
    this._successHandler = opt.onSuccess;
    this._failureHandler = opt.onFailure;
    this.isActive = true;
    this.stateChangeFunc(this.isActive);
    this.show(element, init, partial, this._options);
  },

  finish: function() {
    var text = this.getText();
    if(    (this._options.size() == 0 || this._options.include(text))
        && (this._regexp == undefined || this._regexp.test(text)) )
    {
      this.isActive = false;
      this.stateChangeFunc(this.isActive);
      this.hide();
      if (this._successHandler) this._successHandler(text);
    }
    else {
      this.setError();
    }
  },

  cancel: function() {
    this.isActive = false;
    this.stateChangeFunc(this.isActive);
    this.hide();
    if (this._failureHandler) this._failureHandler();
  }

});
