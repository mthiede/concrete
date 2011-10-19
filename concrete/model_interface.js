// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.
//
// The ModelInterface manages the model represented by DOM elements

Element.addMethods({

  // speed optimization in case the class is known this will be faster
  feature: function(e, clazz) {
    if (clazz) {
      return e.findAncestor(clazz);
    }
    else {
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
    if (!listener.elementChanged || !(listener.elementChanged instanceof Function) ||
        !listener.elementAdded || !(listener.elementAdded instanceof Function) ||
        !listener.elementRemoved || !(listener.elementRemoved instanceof Function))
        throw new Error ("incomplete listener interface");
    this._modelChangeListeners.push(listener);
  },

  setDisplayValueProvider: function(dvp) {
    this._displayValueProvider = dvp;
  },
  
  elements: function() {
    return this.modelRoot.childElements().collect(function(e) {
      return this._collectElementsRecursive(e);
    }, this).flatten();
  },

  // creates the element or elements described be +model+ before or after the element +target+
  // or at the bottom of slot +target+
  createElement: function(target, where, model, options) {
    if (!(["before", "after", "bottom"].include(where))) throw new Error ("unknown position");
    if (where == "bottom" && target != this.modelRoot && !target.hasClassName("ct_slot")) throw new Error ("not a slot");
    if (where != "bottom" && !target.hasClassName("ct_element")) throw new Error ("not an element");
    if (!(model instanceof Array)) model = [ model ];
    if (where == "after") model = model.reverse();
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
  
  extractModel: function(element) {
    var result = {_class: element.mmClass.name};
    if( element.foldButton ) {
      result["_view"] = {"collapsed": element.foldButton.hasClassName("ct_fold_closed")};
    }
    element.features.each(function(f) {
      var children = f.slot.childElements().reject(function(v){return v.hasClassName("ct_empty"); });
      if (children.size() > 0) {
        var converted = [];
        if (f.mmFeature.isContainment()) {
          converted = children.collect(function(v){return this.extractModel(v); }, this);
        }
        else if (f.mmFeature.isReference()) {
          converted = children.collect(function(v){return v.value; }, this);
        }
        else {
          converted = children.collect(function(v){
            if (f.mmFeature.type.isInteger()) {
              return parseInt(v.value);
            }
            else if (f.mmFeature.type.isFloat()) {
              return parseFloat(v.value);
            }
            else if (f.mmFeature.type.isBoolean()) {
              return v.value == "true";
            }
            else {
              return v.value; 
            }
          });
        }
        if (children.size() == 1) {
          result[f.mmFeature.name] = converted.first();
        }
        else {
          result[f.mmFeature.name] = converted;
        }
      }
    }, this);
    return result;
  },

  // if no +element+ is provided redrawing will start on model root
  redrawDisplayValues: function(element) {
    if (!this._displayValueProvider) return; 
    if (element == undefined) {
      this.modelRoot.childElements().each(function(c) {
        this.redrawDisplayValues(c);
      }, this);
    }
    else {
      element.features.each(function(f) {
        var children = f.slot.childElements().reject(function(v){return v.hasClassName("ct_empty"); });
        if (children.size() > 0) {
          if (f.mmFeature.isContainment()) {
            children.each(function(c) {
              this.redrawDisplayValues(c);
            }, this);
          }
          else {
            children.each(function(c) {
              c.textContent = this._displayValue(c.value, f);
            }, this);
          }
        }
      }, this);
    }
  },
  
  // Private

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
  
  _collectElementsRecursive: function(element) {
    var result = [element];
    element.features.each(function(f) {
      if (f.mmFeature.isContainment()) {
        result = result.concat(f.slot.childElements().collect(function(c) {
          return this._collectElementsRecursive(c);
        }, this).flatten());
      }
    }, this);
    return result;
  },
  
  // inserts a instance of the template representing element into slot
  // also inserts template instances for all contained elements
  // this function is optimized to minimize model load time
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
    for (var i=0; i<tmpl.featurePositions.length; i++) {
      var mmf = tmpl.mmFeatures[i];
      var f = children[tmpl.featurePositions[i]];
      inst.features.push(f);
      var values = element[mmf.name];
      if (!(values instanceof Array)) values = [ values ].compact();
      f.mmFeature = mmf;
      var slot = children[tmpl.slotPositions[i]];
      f.slot = slot;
      if (values.size() > 0) {
        if (mmf.isContainment()) {
          if (options.collapse) f.hide();
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
          fIndex = parentElement.features.indexOf(parentFeature) + 1;	// (don't var fIndex as it already exists...)
          element = parentElement;
        }
        else {
          return false;
        }
      }
    }
  }

};

