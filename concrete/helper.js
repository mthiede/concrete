// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Helper = {

  createDOMNode: function(tag, attrs, inner) {
    var node = new Element(tag);
    if (attrs['class']) node.className = attrs['class'];
    if (attrs.style) node.writeAttribute("style", attrs.style);
    node.innerHTML = inner;
    return node;
  },

  // simple pretty printing, objects in an array are indented
  prettyPrintJSON: function(json) {
    var lastIndex = 0;
    var result = "";
    var indent = "";
    var objectNestLevel = 0;
    var dedentLevels = [];
    var firstObject = true;
    var firstList = true;
    var writeLine = function(i) {
      result = result + json.slice(lastIndex, i);
      lastIndex = i;
    };
    for (var i=0; i < json.length; i++) {
      if (json[i] == "{" ) {
        writeLine(i);
        if (!firstObject) result = result + "\n" + indent;
        firstObject = false;
        objectNestLevel++;
      }
      else if (json[i] == "}" ) {
        objectNestLevel--;
        if (objectNestLevel == dedentLevels.last()) {
          dedentLevels.pop();
          indent = indent.slice(2);
        }
      }
      else if (json[i] == "[") {
        writeLine(i+1);
        if (!firstList) indent = indent + "  ";
        firstList = false;
      }
      else if (json[i] == "]") {
        indent = indent.slice(2);
      }
      else if (json[i] == ":" && json[i+2] == "{") {
        writeLine(i+2);
        indent = indent + "  ";
        dedentLevels.push(objectNestLevel);
      }
    }
    writeLine(json.length);
    return result;
  }

};

