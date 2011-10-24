// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.TemplateProvider = Class.create({

  // +templateRoot+ is the DOM element containing the templates
  //
  // Options:
  //   identifierAttribute: name of the feature that holds the identifier, default: none
  //   featureSortFunc: function providing values for features used to sort them, default: none 
  //   alwaysHideFeatures: names of the features which should always be hidden, default: none
  //
  initialize: function(templateRoot, options) {
    this.templateRoot = templateRoot;
    this._templateByClass = {};
    this.options = options || {};
    this.options.alwaysHideFeatures = this.options.alwaysHideFeatures || [];
  },

  emptyValue: function(feature) {
    var value = new Element("span");
    value.className = "ct_value ct_empty";
    value.innerHTML = "&lt;"+feature.mmFeature.name+"&gt;";
    return value;
  },

  emptyElement: function(parentNode, feature) {
    var placeholderText = null;
    if (feature) {
      placeholderText = "&lt;"+feature.mmFeature.name+"&gt;";
    }
    else {
      placeholderText = "click here to start editing";
    }
    var element = new Element("span");	// normal case
    if (parentNode.tagName.toUpperCase() == "TBODY") {
      cols = parentNode.up("table").select("tr").max(function(r) { return r.childElements().select(function(c) {return c.tagName.toUpperCase() == "TD";}).size(); });
      element = new Element("tr");
      element.className = "ct_element ct_empty";
      element.features = [];
      // adding child td node via innerHTML doesn't work in Firefox as long as the parent tr node is not child of a table
      var td = new Element("td");
      td.writeAttribute("colspan", cols);
      td.innerHTML = placeholderText;
      element.appendChild(td);
    }
    else {
      element.className = "ct_element ct_empty";
      element.innerHTML = placeholderText;
      element.features = [];
    }
    return element;
  },

  templateByClass: function(clazz) {
    if (this._templateByClass[clazz.name]) return this._templateByClass[clazz.name];

    var tmpl = this.templateRoot.down(".ctc_"+this._asClassPart(clazz.name));
    if (tmpl) {
      this._completeDomBasedTemplate(tmpl, clazz);
    }
    else {
      tmpl = this._createGenericTemplate(clazz);
    }
    return this._templateByClass[clazz.name] = tmpl;
  },

  _createGenericTemplate: function(clazz) {
    this.templateRoot.insert({bottom: "<div class='ct_element ctc_"+this._asClassPart(clazz.name)+"'><div class='hl_header'></div></div>"});
    var tmpl = this.templateRoot.childElements().last();
    tmpl.mmClass = clazz;
    var headDiv = tmpl.down();
    headDiv.insert({bottom: "<span class='ct_fold_button'></span> "});
    headDiv.insert({bottom: "<span class='ct_element_icon'></span> "});
    headDiv.insert({bottom: "<span class='ct_handle ct_class_name'>"+clazz.name+"</span> "});
    var ftmpls = [];
    var features = clazz.allFeatures();
    if (this.options.featureSortFunc) features = features.sortBy(this.options.featureSortFunc);
    features.each(function(f) {
      var ft;
      var hideStrat = this.options.alwaysHideFeatures.include(this._asClassPart(f.name)) ? "ct_always_hide" : "ct_auto_hide";
      if (f.kind == "attribute") {
        if (this.options.identifierAttribute && this._asClassPart(f.name) == this.options.identifierAttribute) {
          headDiv.insert({bottom: "<span class='ct_attribute ctn_"+this._asClassPart(f.name)+" ct_identifier_attribute'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
        }
        else {
          headDiv.insert({bottom: "<span class='ct_attribute ctn_"+this._asClassPart(f.name)+" "+hideStrat+"'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
        }
        ft = headDiv.childElements().last();
      }
      else if (f.kind == "reference") {
        headDiv.insert({bottom: "<span class='ct_reference ctn_"+this._asClassPart(f.name)+" "+hideStrat+"'><span class='ct_feature_name'>"+f.name+":</span> <span class='ct_slot'></span></span> "});
        ft = headDiv.childElements().last();
      }
      else if (f.kind == "containment") {
        tmpl.insert({bottom: "<div class='ct_containment ctn_"+this._asClassPart(f.name)+" "+hideStrat+"'><span class='ct_feature_name'>"+f.name+":</span><div class='ct_slot'></div></div>"});
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
    var allFeatureTemplates = tmpl.select(".ct_attribute").concat(tmpl.select(".ct_reference")).concat(tmpl.select(".ct_containment"));
    var outerThis = this;
    clazz.allFeatures().each(function(f) {
      var msg = " template not found for '"+f.name+"' in class '"+clazz.name+"'";
      var ft;
      if (f.isAttribute()) {
        ft = tmpl.down(".ct_attribute.ctn_"+outerThis._asClassPart(f.name));
        if (!ft) throw new Error("attribute"+msg);
      }
      else if (f.isReference()) {
        ft = tmpl.down(".ct_reference.ctn_"+outerThis._asClassPart(f.name));
        if (!ft) throw new Error("reference"+msg);
      }
      else if (f.isContainment()) {
        ft = tmpl.down(".ct_containment.ctn_"+outerThis._asClassPart(f.name));
        if (!ft) throw new Error("containment"+msg);
      }
      else {
        throw new Error("Unknown feature kind");
      }
      if (!ft.down(".ct_slot")) throw new Error("no slot in template for class '"+clazz.name+"' feature '"+f.name+"'");
      ft.mmFeature = f;
      delete allFeatureTemplates[allFeatureTemplates.indexOf(ft)];
    });
    allFeatureTemplates.each(function(ft) {
      throw new Error("Unused feature template '"+ft.className+"' in class '"+clazz.name+"'");
    });
  },

  /**
   * Removes (the most frequently-occurring) non-identifier characters from
   * the given name and camel-cases it.
   */
  _asClassPart: function(name) {
    name = name.replace(/[ \\.\\*]/g, '-');
    return name.camelize();
  }

});
