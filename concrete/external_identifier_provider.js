// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

// Interface ExternalIdentifierProvider
//
//  getElementInfo: function(ident, options) {}
//    returns the element info if +ident+ is the identifier of an element, false otherwise
//    the element info is an object with properties +type+ and +module+
//    if option +ignoreModule+ is specified, elements from that module will be ignored
//
//  getIdentifiers: function(types) {}
//    returns the identifiers of all elements of classes given in +types+ 

// assumes an index consisting of modules, each with the following structure: 
//  [ { name: <module name>, elements: [
//      { _class: <class name>, name: <element name>, elements: [
//        { _class: <class name>, name: <element name>, ...
//
// optionally the property "elements" may hold a single element instead of an Array
//
Concrete.IndexBasedExternalIdentifierProvider = Class.create({

  initialize: function(index, metamodelProvider) {
    this._index = index;
    this._metamodelProvider = metamodelProvider;
    this._separator = "/";
  },

  getElementInfo: function(ident, options) {
    if (!Object.isString(ident)) return false;
    for (var i=0; i<this._index.size(); i++) {
      var m = this._index[i];
      if (!options || !options.ignoreModule || options.ignoreModule != m.name) {
        var parts = ident.split(this._separator);
        var type = this._getType(m, parts);
        if (type) return { type: type, module: m.name };
      }
    };
    return false;
  },

  getIdentifiers: function(type) {
    var typenames = type.allSubTypes().concat(type).collect(function(t){ return t.name; });
    var result = [];
    this._index.each(function(m) {
      result = result.concat(this._getIdentifiers(m, typenames, ""));
    }, this);
    return result;
  },

  getAllElementInfo: function() {
    var result = [];
    this._index.each(function(m) {
      result = result.concat(this._getAllElementInfo(m, "", m));
    }, this);
    return result;
  },

  // private

  _getType: function(cont, parts) {
    var local = parts.shift();
    while (local == "" && parts.size() > 0) { local = parts.shift(); }
    if (local == "") return false;
    var elements = cont.elements;
    if (!(elements instanceof Array)) elements = [elements].compact();
    var e = elements.find(function(e) { return e.name == local; });
    if (e) {
      if (parts.size() > 0) {
        return this._getType(e, parts);
      }
      else {
        return this._metamodelProvider.metaclassesByName[e._class];
      }
    }
    else {
      return false; 
    }
  },

  _getIdentifiers: function(cont, typenames, path) {
    var result = [];
    var elements = cont.elements;
    if (!(elements instanceof Array)) elements = [elements].compact();
    elements.each(function(e) {
      var epath = path + this._separator + e.name;
      if (typenames.include(e._class)) {
        result.push(epath);
      }
      result = result.concat(this._getIdentifiers(e, typenames, epath));
    }, this);
    return result; 
  },

  _getAllElementInfo: function(cont, path, module) {
    var result = [];
    var elements = cont.elements;
    if (!(elements instanceof Array)) elements = [elements].compact();
    elements.each(function(e) {
      var epath = path + this._separator + e.name;
      result.push({identifier: epath, type: e._class, module: module.name});
      result = result.concat(this._getAllElementInfo(e, epath, module));
    }, this);
    return result; 
  }

});

