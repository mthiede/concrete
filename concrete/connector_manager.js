// Concrete Model Editor
//
// Copyright (c) 2012 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Connectors = {
  createConnectorManager: function(canvasRoot) {

    var elementAdded: function(element) {
    };

    var elementChanged: function(element, feature) {
    };

    var elementRemoved: function(element) {
    };

    return {
      getModelChangeListener: function() {
        return {
          elementAdded: elementAdded,
          elementChanged: elementChanged,
          elementRemoved: elementRemoved,
          rootChanged: function() {},
          commitChanges: function() {}
        };
      }
    };
  }
};
