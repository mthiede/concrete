// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.
//
// The ModelInterface manages the model represented by DOM elements

Element.addMethods({
	// speed optimization in case the class is known this will be faster
	mmFeature: function(e, clazz) {
		if (clazz) {
			var feat = e.findAncestor(clazz);
		}
		else {
			var feat = e.findAncestor(["ct_attribute", "ct_reference", "ct_containment"]);			
		}
		return feat.mmFeature;
	},
	
	featureValues: function(e, featureName) {
		if (!e.featuresByName) {
			e.featuresByName = {};
			e.features.each(function(f) { e.featuresByName[f.mmFeature.name] = f; });
		}
		var feat = e.featuresByName[featureName];
		if (feat.mmFeature.isContainment()) {
			return feat.slot.childElements().select(function(c) { return !c.hasClassName("ct_empty")});
		}
		else {
			return feat.slot.childElements().select(function(c) { return !c.hasClassName("ct_empty")}).collect(function(c) {return c.textContent});
		}
	}
})

Concrete.ModelInterface = Class.create({
	
	// +modelRoot+ is the DOM element containing the model elements
	initialize: function(modelRoot, templateProvider, metamodelProvider) {
		this.modelRoot = modelRoot;
		this.templateProvider = templateProvider;
		this.metamodelProvider = metamodelProvider;
		this._modelChangeListeners = [];
	},
	
	addModelChangeListener: function(listener) {
		if (!listener.elementChanged || !(listener.elementChanged instanceof Function) ||
			  !listener.elementAdded || !(listener.elementAdded instanceof Function) ||
			  !listener.elementRemoved || !(listener.elementRemoved instanceof Function))
				throw new Error ("incomplete listener interface");
		this._modelChangeListeners.push(listener);
	},
	
	elements: function() {
		return this.modelRoot.childElements().collect(function(e) {
			return this._collectElementsRecursive(e);
		}, this).flatten();
	},

	// creates the element or elements described be +model+ before or after the element +target+
	// or at the bottom of slot +target+
	createElement: function(target, where, model) {
		if (!(["before", "after", "bottom"].include(where))) throw new Error ("unknown position");
		if (where == "bottom" && target != this.modelRoot && !target.hasClassName("ct_slot")) throw new Error ("not a slot");
		if (where != "bottom" && !target.hasClassName("ct_element")) throw new Error ("not an element");
		if (!(model instanceof Array)) model = [ model ];
		if (where == "after") model = model.reverse();
		model.each(function(e) {
			var inst = this._instantiateTemplateRecursive(e, target, where);
			this._notifyModelChangeListeners("added", inst);
		}, this);
		var parent = target.up(".ct_element");
		var feature = parent && target.up(".ct_containment");
		parent = parent || this.modelRoot;
		this._notifyModelChangeListeners("changed", parent, feature);
		this._notifyModelChangeListeners("commit");
	},
	
	moveElement: function(element) {
		// TODO
	},
		
	removeElement: function(elements) {
		if (!(elements instanceof Array)) elements = [ elements ];
		elements.each(function(element) {
			if (!element.hasClassName("ct_element")) throw new Error ("not an element");
			element.remove();
			this._notifyModelChangeListeners("removed", element);
			var parent = element.up(".ct_element");
			var feature = parent && element.up(".ct_containment");
			parent = parent || this.modelRoot;
			this._notifyModelChangeListeners("changed", parent, feature);
		}, this);
		this._notifyModelChangeListeners("commit");
	},
	
	createValue: function(target, where, text) {
		if (!(["before", "after", "bottom"].include(where))) throw new Error ("unknown position");
		if (where == "bottom" && !target.hasClassName("ct_slot")) throw new Error ("not a slot");
		if (where != "bottom" && !target.hasClassName("ct_value")) throw new Error ("not a value");
		var arg = {}; arg[where] = Concrete.Helper.createDOMNode('span', {class: 'ct_value'}, (text || ""));
		target.insert(arg);
		this._notifyModelChangeListeners("changed", target.up(".ct_element"), target.findAncestor(["ct_attribute", "ct_reference"]));
		this._notifyModelChangeListeners("commit");
	},
	
	changeValue: function(value, text) {
		if (!value.hasClassName("ct_value")) throw new Error("not a value");
		value.textContent = text;
		this._notifyModelChangeListeners("changed", value.up(".ct_element"), value.findAncestor(["ct_attribute", "ct_reference"]));
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
		var result = {_class: element.mmClass.name}
		element.features.each(function(f) {
			var childs = f.slot.childElements().reject(function(v){return v.hasClassName("ct_empty"); });
			if (childs.size() > 0) {
				if (f.mmFeature.isContainment()) {
					var converted = childs.collect(function(v){return this.extractModel(v); }, this);
				}
				else if (f.mmFeature.isReference()) {
					var converted = childs.collect(function(v){return v.textContent; }, this);
				}
				else {
					var converted = childs.collect(function(v){
						if (f.mmFeature.type.isInteger()) {
							return parseInt(v.textContent);
						}
						else if (f.mmFeature.type.isBoolean()) {
							return v.textContent == "true";
						}
						else {
							return v.textContent; 
						}
					});
				}
				if (childs.size() == 1) {
					result[f.mmFeature.name] = converted.first();
				}
				else {
					result[f.mmFeature.name] = converted;
				}
			}
		}, this)
		return result;
	},
	
	// Private
	
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
	_instantiateTemplateRecursive: function(element, target, where) {
		var clazz = this.metamodelProvider.metaclassesByName[element._class];
		if (!clazz) return;
		var tmpl = this.templateProvider.templateByClass(clazz);
		if (!tmpl.featurePositions) this._addTemplateInfo(tmpl);

		var inst = Concrete.Helper.createDOMNode(tmpl.tagName, {class: tmpl.className, style: tmpl.readAttribute("style")}, tmpl.innerHTML);
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
		inst.mmClass = tmpl.mmClass;

		inst.features = [];
		var childs = inst.allChildren();
		for (var i=0; i<tmpl.featurePositions.length; i++) {
			var mmf = tmpl.mmFeatures[i];
			var f = childs[tmpl.featurePositions[i]];
			inst.features.push(f);
			var values = element[mmf.name];
			if (!(values instanceof Array)) values = [ values ].compact();
			f.mmFeature = mmf;
			var slot = childs[tmpl.slotPositions[i]];
			f.slot = slot;
			if (values.size() > 0) {
				if (mmf.isContainment()) {
					values.each(function(v) {
						this._instantiateTemplateRecursive(v, slot, "bottom");
					}, this);
				}
				else {
					values.each(function(v) {
						var vale = Concrete.Helper.createDOMNode('span', {class: 'ct_value'}, v);
						slot.appendChild(vale);
					});
				}
			}
			else if (f.hasClassName("ct_auto_hide")) {
				f.hide();
			}
		}
		return inst;
	},
		
	// add information used to make template instantiation more efficient 
	_addTemplateInfo: function(tmpl) {
		var allChilds = tmpl.allChildren();
		var ftmpls = tmpl.select(".ct_attribute").concat(tmpl.select(".ct_reference")).concat(tmpl.select(".ct_containment"));
		tmpl.featurePositions = ftmpls.collect(function(ft) { return allChilds.indexOf(ft); });
		tmpl.mmFeatures = ftmpls.collect(function(ft) { return ft.mmFeature; });
		tmpl.slotPositions = ftmpls.collect(function(ft) { return allChilds.indexOf(ft.down(".ct_slot")); });
	}

});
