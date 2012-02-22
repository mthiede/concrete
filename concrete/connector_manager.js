// Concrete Model Editor
//
// Copyright (c) 2012 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.createConnectorManager = function(canvasRoot, referenceManager, modelInterface, identifierProvider) {

  var referenceAdded = function(value, target) {
    var refHandle = value.findAncestor("ct_reference").down(".ct_ref_handle");
    var con;
    if (refHandle) {
      con = Concrete.Graphics.createConnector(canvasRoot, refHandle, target);
      con._connector_source_value = value;
      con.draw();
      connectors.push(con);
    }
  };

  var referenceRemoved = function(value, target) {
    var index = undefined;
    connectors.each(function(c, i) {
      if (c._connector_source_value === value) {
        index = i;
        return true;
      }
    });
    if (index !== undefined) {
      connectors[index].destroy();
      connectors.splice(index, 1);
    }
  };

  var connectors = [];

  referenceManager.addReferenceChangeListener({
    referenceAdded: referenceAdded,
    referenceRemoved: referenceRemoved
  });

  return {
    repaint: function() {
      connectors.each(function(c) {
        c.draw();
      });
    }
  };
};
