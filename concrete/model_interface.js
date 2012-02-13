// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

/**
 * The ModelInterface manages the model represented by DOM elements
 * and provides an API on top of it.
 */ 


/*
 * Add methods to the prototype of the DOM Element.
 */
Element.addMethods({

  feature: function(e, clazz) {
    if( clazz ) {
      return e.findAncestor(clazz);
    } else {
      return e.findAncestor(["ct_attribute", "ct_reference", "ct_containment"]);
    }
  },

  mmFeature: function(e, clazz) {
    return e.feature(clazz).mmFeature;
  },

  featureValues: function(e, feature) {
    if (Object.isString(feature)) {
      if (!e.featuresByName) {
        e.featuresByName = {};
        e.features.each(function(f) { e.featuresByName[f.mmFeature.name] = f; });
      }
      feature = e.featuresByName[feature];
    }
    else if (!feature.mmFeature) {
      feature = e.features.find(function(f) {return f.mmFeature == feature; });
    }
    var values = feature.slot.childElements();
    if (feature.mmFeature.isContainment()) {
      if (values.size() > 1) {
        // optimization: empty place holder values can not appear among other children
        return values;
      }
      else if (values.size() == 1 && !values[0].hasClassName("ct_empty")) {
        return [values[0]];
      }
      else {
        return [];
      }
    }
    else {
      if (values.size() > 1) {
        // optimization: empty place holder values can not appear among other children
        return values.collect(function(c) {return c.value; });
      }
      else if (values.size() == 1 && !values[0].hasClassName("ct_empty")) {
        return [values[0].value]; 
      }
      else {
        return []; 
      }
    }
  },

  isElement: function(e) {
    return e.mmClass != undefined;
  }
});


Concrete.ModelInterface = Class.create({
  
  // +modelRoot+ is the DOM element containing the model elements
  // Options:
  //   displayValueProvider: a function which returns the display value for an attribute or reference, 
  //       the function must take two arguments, the original value text and the value node's feature parent 
  //       default: none
  //
  initialize: function(modelRoot, templateProvider, metamodelProvider, options) {
    this.modelRoot = modelRoot;
    this.templateProvider = templateProvider;
    this.metamodelProvider = metamodelProvider;
    options = options || {};
    this._displayValueProvider = options.displayValueProvider;
    this._modelChangeListeners = [];
  },

  addModelChangeListener: function(listener) {
    if( !listener.elementChanged || !(listener.elementChanged instanceof Function) ||
        !listener.elementAdded || !(listener.elementAdded instanceof Function) ||
        !listener.elementRemoved || !(listener.elementRemoved instanceof Function) ) {
      throw new Error ("incomplete listener interface");
    }
    this._modelChangeListeners.push(listener);
  },

  setDisplayValueProvider: function(dvp) {
    this._displayValueProvider = dvp;
  },

  /**
   * @returns The root elements of the model (as DOM objects).
   */
  rootElements: function() {
    return this.modelRoot.childElements();
  },

  /**
   * @returns The whole model in abstract syntax.
   */
  model: function() {
    return this.rootElements().collect(function(n) { return this.extractModel(n); }, this);
  },

  /**
   * @returns <em>All</em> the elements in the model (as DOM objects).
   */
  elements: function() {
    return this.rootElements().collect(function(e) {
      return this._collectElementsRecursive(e);
    }, this).flatten();
  },

  /**
   * Creates the element or elements described by 'model' in the position
   * indicated by 'where', relative to the 'target' element.
   */
  createElement: function(target, where, model, options) {
    if( !(["before", "after", "bottom"].include(where)) ) throw new Error ("unknown position");
    if( where == "bottom" && target != this.modelRoot && !target.hasClassName("ct_slot") ) throw new Error ("not a slot");
    if( where != "bottom" && !target.hasClassName("ct_element") ) throw new Error ("not an element");
    if( !(model instanceof Array) ) model = [model];
    if( where == "after" ) model = model.reverse();
    model.each(function(e) {
      var inst = this._instantiateTemplateRecursive(e, target, where, options);
      this._notifyModelChangeListeners("added", inst);
    }, this);
    var parent = target.up(".ct_element");
    var feature = parent && target.up(".ct_containment");
    parent = parent || this.modelRoot;
    this._notifyModelChangeListeners("changed", parent, feature);
    this._notifyModelChangeListeners("commit");
    if (parent != this.modelRoot) {
      if (parent.foldButton) parent.foldButton.removeClassName("ct_fold_empty");
    }
  },
  
  moveElement: function(element) {
    // TODO
  },
    
  removeElement: function(elements) {
    if (!(elements instanceof Array)) elements = [ elements ];
    elements.each(function(element) {
      if (!element.hasClassName("ct_element")) throw new Error ("not an element");
      var parent = element.up(".ct_element");
      var feature = parent && element.up(".ct_containment");
      parent = parent || this.modelRoot;
      element.remove();
      this._notifyModelChangeListeners("removed", element);
      this._notifyModelChangeListeners("changed", parent, feature);
      if (parent != this.modelRoot) {
        if (parent.foldButton && !this._hasChildElements(parent)) parent.foldButton.addClassName("ct_fold_empty");
      }
    }, this);
    this._notifyModelChangeListeners("commit");
  },
  
  createValue: function(target, where, text) {
    if (!(["before", "after", "bottom"].include(where))) throw new Error ("unknown position");
    if (where == "bottom" && !target.hasClassName("ct_slot")) throw new Error ("not a slot");
    if (where != "bottom" && !target.hasClassName("ct_value")) throw new Error ("not a value");
    text = (text || "").toString();
    var feature = target.findAncestor(["ct_attribute", "ct_reference"]);
    var valueNode = Concrete.Helper.createDOMNode('span', {'class': 'ct_value'}, this._displayValue(text, feature));
    valueNode.value = text;
    var arg = {}; arg[where] = valueNode;
    target.insert(arg);
    this._notifyModelChangeListeners("changed", target.up(".ct_element"), feature);
    this._notifyModelChangeListeners("commit");
  },
  
  changeValue: function(value, text) {
    if (!value.hasClassName("ct_value")) throw new Error("not a value");
    var feature = value.findAncestor(["ct_attribute", "ct_reference"]);
    text = text.toString();
    value.textContent = this._displayValue(text, feature);
    value.value = text;
    this._notifyModelChangeListeners("changed", value.up(".ct_element"), feature);
    this._notifyModelChangeListeners("commit");
  },

  removeValue: function(value) {
    if (!value.hasClassName("ct_value")) throw new Error("not a value");
    var element = value.up(".ct_element");
    var feature = value.findAncestor(["ct_attribute", "ct_reference"]);
    value.remove();
    this._notifyModelChangeListeners("changed", element, feature);
    this._notifyModelChangeListeners("commit");
  },

  /**
   * Extracts the (sub) model in its abstract syntax from the given model (DOM) element,
   * recursively.
   */
  extractModel: function(element) {
    var result = { _class: element.mmClass.name };
    if( element.foldButton ) {
      result["_view"] = result["_view"] || {};
      result["_view"]["collapsed"] = element.foldButton.hasClassName("ct_fold_closed");
    }
    if( element.hasClassName("ct_draggable") ) {
      result["_view"] = result["_view"] || {};
      result["_view"]["position"] = { left: element.style.left, top: element.style.top};
    }
    if( element.variantInfo() ) {
      result["_view"] = result["_view"] || {};
      result["_view"]["variant"] = element.variantInfo().current;
    }
    element.features.each(function(f) {
      // all non-empty feature values:
      var children = f.slot.childElements().reject( function(v) { return v.hasClassName("ct_empty"); } );

      // assign a container size to the extracted model element if the feature's slot is resizable:
      if( f.slot.hasClassName("ct_resizable") ) {
        result["_view"] = result["_view"] || {};
        result["_view"]["container-size"] = result["_view"]["container-size"] || {};
        result["_view"]["container-size"][f.mmFeature.name] = { width: f.slot.style.width, height: f.slot.style.height };
      }
      // TODO  now the feature's slot influences the _view info on its containing element: desirable?

      if( children.size() > 0 ) {
        var converted = [];
        var feature = f.mmFeature;
        if( feature.isContainment() ) {
          converted = children.collect(function(v) { return this.extractModel(v); }, this);    // this == Concrete.ModelInterface
        }
        else if( feature.isReference() ) {
          converted = children.collect(function(v) { return v.value; }, this);    // this == Concrete.ModelInterface
        } else {  // feature.isAttribute():
          var type = feature.type;
          converted = children.collect(function(v) {
            if( type.isInteger() ) {
              return parseInt(v.value, 10);
            } else if( type.isFloat() ) {
              return parseFloat(v.value);	// TODO  preserve trailing/precision zeroes
            } else if( type.isBoolean() ) {
              return v.value == "true";
            } else {  // type.isString():
              return v.value; 
            }
          });
        }
        if( children.size() == 1 ) {
          result[feature.name] = converted.first();
        } else {
          result[feature.name] = converted;
        }
      }
    }, this);  // this == Concrete.ModelInterface
    return result;
  },

  /**
   * Traverses the (sub) model hanging off the given model element, executing
   * various functions for element themselves, as well as its references and
   * attributes.
   * 
   * @param element
   * @param actions,
   *            may have the following properties which should be functions
   *            taking a value object of the indicated type and its meta type:
   *              element, reference, attribute
   *            (containment is handled through the recursion)
   */
  traverse: function(element, actions) {
//  (function _traverse(element, actions) {
//    
//  })(element, actions);
    // TODO  remove reliance on passing of this to .each by using pattern above
    element.features.each(function(f) {
      // all non-empty feature values:
      var children = f.slot.childElements().reject( function(v) { return v.hasClassName("ct_empty"); } );
      if( children.size() == 0 ) return;

      var feature = f.mmFeature;
      if( feature.isContainment() ) {
        children.each(function(v) { this.traverse(v, actions); }, this);  // this == Concrete.ModelInterface
      } else if( feature.isReference() ) {
        if( actions.reference ) {
          children.each(function(v) { actions.reference.call(v, feature); });
        }
      } else if( feature.isAttribute() ) {
        if( actions.attribute ) {
          children.each(function(v) { actions.attribute.call(v, feature); });
        }
      }
    }, this);    // this == Concrete.ModelInterface
    if( actions.element ) {
      actions.element.call(element, element.mmClass);
    }
  },

  /**
   * @returns All incoming references as an Array of a pair { element: ..., feature: ... }.
   */
  incomingReferences: function(element) {
    // TODO  implement
  },

  /**
   * Redraws the displayed values in the sub model hanging off the given element.
   * If no element is provided, redrawing will be done on the whole model.
   */
  redrawDisplayValues: function(element) {
    if( !this._displayValueProvider ) return; 
    if( element == undefined ) {
      this.rootElements().each(function(c) {
        this.redrawDisplayValues(c);
      }, this);
    } else {
      element.features.each(function(f) {
        var children = f.slot.childElements().reject( function(v) { return v.hasClassName("ct_empty"); } );
        if( children.size() == 0 ) return;
        if( f.mmFeature.isContainment() ) {
          children.each(function(c) { this.redrawDisplayValues(c); }, this);
        } else {
          children.each(function(c) { c.textContent = this._displayValue(c.value, f); }, this);
        }
      }, this);
    }
  },


  // -- private functions --

  _hasChildElements: function(element) {
    return element.features.any(function(f) {
        return f.mmFeature.isContainment() && f.slot.childElements().any(function(c) { 
          return !c.hasClassName("ct_empty");
        });
      });
  },

  _notifyModelChangeListeners: function(type, element, feature) {
    if (type == "changed")
      if (element == this.modelRoot)
        this._modelChangeListeners.each(function(l) {l.rootChanged(this.modelRoot);}, this);
      else
        this._modelChangeListeners.each(function(l) {l.elementChanged(element, feature);});
    else if (type == "added")
      this._modelChangeListeners.each(function(l) {l.elementAdded(element);});
    else if (type == "removed")
      this._modelChangeListeners.each(function(l) {l.elementRemoved(element);});
    else if (type == "commit")
      this._modelChangeListeners.each(function(l) {l.commitChanges();});
    else
      throw new Error("unknown type");
  },

  /**
   * Collects all elements in the sub model hanging off the given element
   * (including itself) in a flat list.
   */
  _collectElementsRecursive: function(element) {
    var result = [element];
    element.features.each(function(f) {
      if( f.mmFeature.isContainment() ) {
        result = result.concat(f.slot.childElements().collect(function(c) {
          return this._collectElementsRecursive(c);
        }, this).flatten());
      }
    }, this);
    return result;
  },

  /**
   * Inserts a instance of the template representing element into slot.
   * Also inserts template instances for all contained elements.
   * <p>
   * This function is optimized to minimize model load time.
   */
  _instantiateTemplateRecursive: function(element, target, where, options) {
    options = options || {};
    var clazz = this.metamodelProvider.metaclassesByName[element._class];
    if (!clazz) return;
    var tmpl = this.templateProvider.templateByClass(clazz);
    if (!tmpl.featurePositions) this._addTemplateInfo(tmpl);

    var inst = Concrete.Helper.createDOMNode(tmpl.tagName, {'class': tmpl.className, style: tmpl.readAttribute("style")},"");
    if (where == "bottom") {
      target.appendChild(inst);
    }
    else if (where == "before") {
      target.parentNode.insertBefore(inst, target);
    }
    else if (where == "after") {
      if (target.next()) {
        target.parentNode.insertBefore(inst, target.next());
      }
      else {
        target.parentNode.appendChild(inst);
      }
    }
    // set inner HTML only after the new node has been hooked into its parent
    // (otherwise the browser filters nodes like "tr" which it considers invalid at this place)
    inst.innerHTML = tmpl.innerHTML;
    inst.mmClass = tmpl.mmClass;

    inst.features = [];
    var children = inst.allChildren();
    var hasChildElements = false;
    for( var i = 0; i < tmpl.featurePositions.length; i++ ) {
      var mmf = tmpl.mmFeatures[i];
      var f = children[tmpl.featurePositions[i]];
      inst.features.push(f);
      var values = element[mmf.name];
      if (!(values instanceof Array)) values = [ values ].compact();
      f.mmFeature = mmf;
      var slot = children[tmpl.slotPositions[i]];
      f.slot = slot;  // creates a new property 'slot' on the feature's DOM object
      if (values.size() > 0) {
        if (mmf.isContainment()) {
          if (options.collapse) f.hide();
          if (f.slot.hasClassName("ct_resizable") && element._view && element._view["container-size"] && element._view["container-size"][mmf.name]) {
            f.slot.style.width = element._view["container-size"][mmf.name].width;
            f.slot.style.height = element._view["container-size"][mmf.name].height;
          }
          values.each(function(v) {
            this._instantiateTemplateRecursive(v, slot, "bottom", options);
            hasChildElements = true;
          }, this);
        }
        else {
          values.each(function(v) {
            var vale = Concrete.Helper.createDOMNode('span', {'class': 'ct_value'}, this._displayValue(v.toString(), f));
            vale.value = v.toString();
            slot.appendChild(vale);
          }, this);
        }
      }
      else if (f.hasClassName("ct_auto_hide")) {
        f.hide();
      }
      if (f.hasClassName("ct_always_hide")) {
        f.hide();
      }
    }
    if( tmpl.foldButtonPosition != undefined ) {
      inst.foldButton = children[tmpl.foldButtonPosition];
      if( options.collapse ) {
        inst.foldButton.addClassName("ct_fold_closed");
      }
      else {
        inst.foldButton.addClassName("ct_fold_open");
      }
      if (!hasChildElements) inst.foldButton.addClassName("ct_fold_empty");
      // collapse if that info is saved with the model:
      if( element._view && element._view.collapsed ) {
        this.collapseElement(inst);
      }
    }
    if( element._view && element._view.position && inst.hasClassName("ct_draggable") ) {
      inst.style.left = element._view.position.left;
      inst.style.top = element._view.position.top;
    }
    if (element._view && element._view.variant && inst.variantInfo()) {
      inst.setVariantIndex(element._view.variant);
    }
    return inst;
  },

  // (WARNING: copied from editor.js - except the this.adjustMarker() call)
  collapseElement: function(n) {
    n.features.each(function(f) {
      if (f.mmFeature.isContainment()) f.hide();
    });
    if (n.foldButton) {
      n.foldButton.removeClassName("ct_fold_open");
      n.foldButton.addClassName("ct_fold_closed");
    }
  },

  _displayValue: function(text, feature) {
    if (this._displayValueProvider) {
      return this._displayValueProvider(text, feature);
    }
    else {
      return text;
    }
  },

  // add information used to make template instantiation more efficient 
  _addTemplateInfo: function(tmpl) {
    var allChilds = tmpl.allChildren();
    var ftmpls = tmpl.select(".ct_attribute").concat(tmpl.select(".ct_reference")).concat(tmpl.select(".ct_containment"));
    tmpl.featurePositions = ftmpls.collect(function(ft) { return allChilds.indexOf(ft); });
    tmpl.mmFeatures = ftmpls.collect(function(ft) { return ft.mmFeature; });
    tmpl.slotPositions = ftmpls.collect(function(ft) { return allChilds.indexOf(ft.down(".ct_slot")); });
    var foldButton = tmpl.down(".ct_fold_button");
    tmpl.foldButtonPosition = foldButton && allChilds.indexOf(foldButton);
  }

});

Concrete.ModelInterface.Helper = {

  // returns the next element in depth first search order 
  // or false if the last element in the model has been reached
  // 
  // as a speed optimization an optional stack can be used which keeps the
  // parent containers over several invocations of this method
  // in this case the stack must either be empty or it must be in the state
  // established by the last call of this method (i.e. it must not be modified)
  //
  nextElement: function(element, stack) {
    var fIndex = 0;
    while (true) {
      var feature = element.features[fIndex];
      var values = feature && element.featureValues(feature.mmFeature.name);
      if (feature && feature.mmFeature.isContainment() && values.size() > 0 && values[0].isElement()) {
        // found first child in feature
        if (stack) {
          stack.push(element);
          stack.push(feature);
        }
        return values[0];
      }
      else if (fIndex < element.features.size()-1) {
        // next feature
        fIndex++;
      }
      else if (element.next()) {
        // next element
        return element.next();
      }
      else {
        var parentFeature = (stack && stack.pop()) || element.up(".ct_containment");
        if (parentFeature) {
          // go up to parent
          var parentElement = (stack && stack.pop()) || parentFeature.up(".ct_element");
          fIndex = parentElement.features.indexOf(parentFeature) + 1;  // (don't var fIndex as it already exists...)
          element = parentElement;
        }
        else {
          return false;
        }
      }
    }
  }

};

