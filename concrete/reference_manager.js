// Concrete Model Editor
//
// Copyright (c) 2012 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

// The reference manager keeps track of reference between elements.
// It provides API to query the target element for a reference value as well as
// the reference values pointing to a target element. The reference value which act as
// the source of references are the DOM value elements contained in Concrete slot elements.
//
// Options:
//   adaptReferences: if set to true, adapt reference values (i.e. keep references) when 
//                    target identifiers change, default: false
//
Concrete.createReferenceManager = function(modelInterface, identifierProvider, options) {

  // the reference manager needs to take care of 2 different kinds of model changes:
  // 1. changes of reference values, i.e. of reference sources
  // 2. changes of element identifiers, i.e. of reference targets
  // the first is tracked by the model change notifications of the model interface
  // the second is tracked by the identifier change notification by the identifier provider
  // note that the following implementation isn't relying on any special order of the notifications

  // element identifier changed or an element has been added or removed as a whole
  // in the latter case the old or new identifier will be undefined respectively
  var identifierChanged = function(element, oldIdent, newIdent) {
    var oldOther = (oldIdent !== undefined && identifierProvider.getElement(oldIdent));
    var newOther = (newIdent !== undefined && identifierProvider.getElement(newIdent));
    if (newOther && newOther.length !== undefined && newOther.length > 1) {
      // more than one element with new identifier: can't have references to any of them
      newOther.each(function(e) {
        removeAllIncomingRefs(e);
      });
    }
    else {
      if (optionAdaptRefs && newIdent !== undefined) {
        incomingRefs(element).each(function(v) {
          // this will trigger the value changed notification
          modelInterface.changeValue(v, newIdent);
        });
      }
      else {
        // identifier has changed, remove all old incoming references
        removeAllIncomingRefs(element);
      }
      if (newIdent !== undefined) {
        // check unresolved references to find those which can be resolved to the new ident
        resolveUnresolvedRefs(newIdent, element);
      }
    }
    if (oldOther && oldOther.length === undefined) {
      if (oldIdent !== undefined) {
        // there is exactly one element left with the old identifier, repair references
        // which could not be resolved before because of the name clash before
        resolveUnresolvedRefs(oldIdent, oldOther);
      }
    }
  };

  // BEGIN: model interface notifications

  // element has been added with child elements
  var elementAdded = function(element) {
    visitWithChildren(element, function(e) {
      elementRefs(e).each(function(r) {
        refValues(r).each(function(v) {
          handleValueAdded(v);
        });
      });
    });
  };

  // element has been removed with child elements
  var elementRemoved = function(element) {
    visitWithChildren(element, function(e) {
      elementRefs(e).each(function(r) {
        refValues(r).each(function(v) {
          handleValueRemoved(v);
        });
      });
    });
  };

  var valueAdded = function(element, feature, value) {
    if (feature.mmFeature.isReference()) {
      handleValueAdded(value);
    }
  };

  var valueRemoved = function(element, feature, value) {
    if (feature.mmFeature.isReference()) {
      handleValueRemoved(value);
    }
  };

  var valueChanged = function(element, feature, value, oldText, newText) {
    if (feature.mmFeature.isReference()) {
      handleValueRemoved(value);
      handleValueAdded(value);
    }
  };

  // END: model interface notifications

  var handleValueAdded = function(value) {
    var elements = identifierProvider.getElement(value.value);
    if (elements !== undefined && elements.length === undefined) {
      // exactly one target
      setRefTarget(value, elements);
    }
    else {
      // could not resolve
      addUnresolvedRef(value);
    }
  };

  var handleValueRemoved = function(value) {
    unsetRefTarget(value);
    removeUnresolvedRef(value);
  };

  var resolveUnresolvedRefs = function(ident, element) {
    unresolvedRefs.clone().each(function(ur) {
      if (ur.value === ident) {
        setRefTarget(ur, element);
      }
    });
  };

  var removeAllIncomingRefs = function(element) {
    incomingRefs(element).clone().each(function(v) {
      unsetRefTarget(v);
    });
  };

  // set the reference target of value
  // removes the value from the set of unresolved refrences if preset
  // may also be called to change the reference target
  var setRefTarget = function(value, target) {
    var idx;
    if (value._target !== target) {
      if (value._target) {
        unsetRefTarget(value);
      }
      target._incomingRefs = target._incomingRefs || [];
      target._incomingRefs.push(value);
      value._target = target;
      removeUnresolvedRef(value);
      referenceChangeListeners.each(function(l) {
        l.referenceAdded(value, target);
      });
    }
  };

  // unset the reference target of value
  // adds the value to the set of unresolved references
  // may also be called if no reference target was set before
  var unsetRefTarget = function(value) {
    var idx;
    var oldTarget;
    if (value._target) {
      idx = incomingRefs(value._target).indexOf(value);
      if (idx >= 0) {
        value._target._incomingRefs.splice(idx, 1);
      }
      oldTarget = value._target;
      value._target = undefined;
      addUnresolvedRef(value);
      referenceChangeListeners.each(function(l) {
        l.referenceRemoved(value, oldTarget);
      });
    }
  };

  var incomingRefs = function(element) {
    return element._incomingRefs || [];
  };

  var addUnresolvedRef = function(value) {
    unresolvedRefs.push(value);
  };

  var removeUnresolvedRef = function(value) {
    var idx = unresolvedRefs.indexOf(value);
    if (idx >= 0) {
      unresolvedRefs.splice(idx, 1);
    }
  };

  var refValues = function(ref) {
    return ref.slot.childElements().select(function(c) { return !c.hasClassName("ct_empty"); });
  };

  var elementRefs = function(element) {
    return element.features.select(function(f) { return f.mmFeature.isReference(); });
  };

  var visitWithChildren = function(element, visitor) {
    visitor(element);
    element.features.each(function(f) {
      if (f.mmFeature.isContainment()) {
        f.slot.childElements().each(function(c) {
          visitWithChildren(c, visitor);
        });
      }
    });
  };
  
  var unresolvedRefs = [];
  var referenceChangeListeners = [];

  var optionAdaptRefs = (options.adaptReferences === true);

  modelInterface.addModelChangeListener({
    elementAdded: elementAdded,
    elementRemoved: elementRemoved,
    valueAdded: valueAdded,
    valueRemoved: valueRemoved,
    valueChanged: valueChanged,
    commitChanges: function() {}
  });

  identifierProvider.addIdentifierChangeListener({
    identifierChanged: identifierChanged
  });

  return {
    addReferenceChangeListener: function(listener) {
      referenceChangeListeners.push(listener);
    },
    // returns the reference value DOM elements (class ct_value) which reference +element+
    getIncomingRefValues: function(element) {
      return incomingRefs(element);
    },
    // returns the target element for the given reference value DOM element (class ct_value)
    getRefValueTarget: function(value) {
      return value._target;
    }
  };
};
