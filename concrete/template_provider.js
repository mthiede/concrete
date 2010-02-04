// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.TemplateProvider = Class.create({
	
	// +templateRoot+ is the DOM element containing the templates
	initialize: function(templateRoot, opts) {
		this.templateRoot = templateRoot;
		this._templateByClass = {};
		this.options = opts || {};
    this.options.foldButton = true;
	},
	
	emptyValue: function() {
		var value = new Element("span");
		value.className = "ct_value ct_empty";
		value.innerHTML = "&nbsp;";
		return value;
	},
	
	emptyElement: function() {
		var element = new Element("span");
		element.className = "ct_element ct_empty";
		element.innerHTML = "&nbsp;";
		element.features = [];
		return element;
	},
			
	templateByClass: function(clazz) {
		if (this._templateByClass[clazz.name]) return this._templateByClass[clazz.name];
		
		var tmpl = this.templateRoot.down(".ctc_"+clazz.name);
		if (tmpl) {
			this._completeDomBasedTemplate(tmpl, clazz);		
		}
		else {
			tmpl = this._createGenericTemplate(clazz);
		}
		return this._templateByClass[clazz.name] = tmpl;
	},
	
	_createGenericTemplate: function(clazz) {
		this.templateRoot.insert({bottom: "<div class='ct_element ctc_"+clazz.name+"'><div class='hl_header'></div></div>"});
		var tmpl = this.templateRoot.childElements().last();
		tmpl.mmClass = clazz;
		var headDiv = tmpl.down();
    if (this.options.foldButton) {
		  headDiv.insert({bottom: "<span class='ct_fold_button'></span> "});
    }
		headDiv.insert({bottom: "<span class='ct_handle ct_class_name'>"+clazz.name+"</span> "});
		var ftmpls = [];
		clazz.allFeatures().each(function(f) {
			var ft;
			if (f.kind == "attribute") {
				if (this.options.identifierAttribute && f.name == this.options.identifierAttribute) {
					headDiv.insert({bottom: "<span class='ct_attribute ctn_"+f.name+" ct_identifier_attribute'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
				}
				else {
					headDiv.insert({bottom: "<span class='ct_attribute ctn_"+f.name+" ct_auto_hide'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
				}
				ft = headDiv.childElements().last();
			}
			else if (f.kind == "reference") {
				headDiv.insert({bottom: "<span class='ct_reference ctn_"+f.name+" ct_auto_hide'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
				ft = headDiv.childElements().last();
			}
			else if (f.kind == "containment") {
				tmpl.insert({bottom: "<div class='ct_containment ctn_"+f.name+" ct_auto_hide'><span class='ct_feature_name'>"+f.name+":</span><div class='ct_slot'></div></div>"});
				ft = tmpl.childElements().last();
			}
			else {
				throw new Error("Unknown feature kind");
			}
			ft.mmFeature = f;
			ftmpls.push(ft);
		}, this);
		
		return tmpl;
	},
		
	_completeDomBasedTemplate: function(tmpl, clazz) {
		tmpl.mmClass = clazz;
		clazz.allFeatures().each(function(f) {
			var msg = " template not found for '"+f.name+"' in class '"+clazz.name+"'";
			var ft;
			if (f.isAttribute()) {
				ft = tmpl.down(".ct_attribute.ctn_"+f.name);
				if (!ft) throw new Error("attribute"+msg);
			}
			else if (f.isReference()) {
				ft = tmpl.down(".ct_reference.ctn_"+f.name);
				if (!ft) throw new Error("reference"+msg);
			}
			else if (f.isContainment()) {
				ft = tmpl.down(".ct_containment.ctn_"+f.name);
				if (!ft) throw new Error("containment"+msg);
			}
			else {
				throw new Error("Unknown feature kind");
			}
			if (!ft.down(".ct_slot")) throw new Error("no slot in template for class '"+clazz.name+"' feature '"+f.name+"'");
			ft.mmFeature = f;
		});
	}
		
});
