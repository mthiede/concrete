// A hierarchical view of the modules and elements in the index.
//
Concrete.UI.ModuleBrowser = Class.create({

  // Options:
  //   childFilter:      a function defining the displayed children per element 
  //                     it is called for each displayed element and should return the children to be displayed
  //                     default: none, i.e. all children of all elements visible
  //   templateProvider: custom template provider, default: none (use standard template provider) 
  // 
  initialize: function(parentElement, indexMetamodel, options) {
    this.options = options || {};
    var browserElement = this._createContainerElement(parentElement);
    this.browser = this._createBrowser(browserElement, parentElement, indexMetamodel);
  },

  _createContainerElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div class='ct_editor ct_module_browser' style='position: absolute; white-space: nowrap'></div>"
    });
    return parentElement.childElements().last();
  },

  _createTemplatesElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div style='display: none'></div>"
    });
    return parentElement.childElements().last();
  },

  handleEvent: function(event) {
    if ((event.type == "dblclick" || event.keyCode == 13) && this.browser.editorRoot.hasClassName("ct_focus")) {
      var selected = this.browser.selector.selected;
      if (selected) {
        var moduleElement = this._findModuleElement(selected); 
        if (moduleElement) {
          var module = moduleElement.down(".ctn_name").down(".ct_value").value;
          if (!selected.hasClassName("ct_element")) selected = selected.up(".ct_element");
          var target = this.browser.identifierProvider.getIdentifier(selected);
          // remove filename from identifier
          target = target.sub("/"+module, "");
          this.options.onOpenModule(module, target);
        }
      }
    }
	  this.browser.handleEvent(event);
  },

  loadIndex: function(index) {
    this.browser.modelInterface.removeElement(this.browser.modelRoot.childElements());
    index.each(function(m) {
      this.browser.modelInterface.createElement(this.browser.modelRoot, "bottom", this._filterChildren(m), {"collapse": true});
    }, this);
  },

  _findModuleElement: function(node) {
    var element = node.hasClassName("ct_element") ? node : node.up(".ct_element");
    while (!element.parentNode.hasClassName("ct_root")) {
      element = element.up(".ct_element"); 
    }
    return element;
  },

  _createBrowser: function(browserElement, parentElement, indexMetamodel) {
    var tp = this.options.templateProvider || new Concrete.TemplateProvider(this._createTemplatesElement(parentElement), {identifierAttribute: "name"});
    var mp = new Concrete.MetamodelProvider(indexMetamodel);
    var ip = new Concrete.QualifiedNameBasedIdentifierProvider({nameAttribute: "name"});
    var ed = new Concrete.Editor(browserElement, tp, mp, ip, {
      readOnlyMode: true, 
      followReferenceSupport: false,
      showInfoPopups: false,
      scrolling: "vertical"});
    // HACK to disable constraint checking
    ed.constraintChecker._updateAllProblems = function() {};
    return ed;
  },

  _filterChildren: function(element) {
    if (!this.options.childFilter) return element;
    var result = Object.clone(element);
    var elements = this.options.childFilter(element);
    result.elements = elements && elements.collect(function(e) {
      return this._filterChildren(e);
    }, this);
    return result;
  }

});
