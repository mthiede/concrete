Concrete.UI.ModuleEditor = Class.create({

  // Options:
  //   templateProvider:    custom template provider, default: none (use standard template provider) 
  //   rootClasses:         array of names of classes which can be instantiated on root level, default: all
  //   duplicatableClasses: array of names of classes of which multiple instances can exist with the same qualified name, default: none 
  //   identifierAttribute: name of the identifier attribute, default: name
  //   shortReferences:     if set to true, display only the last part of each reference, default: false
  // 
  initialize: function(parentElement, extIdentProvider, metamodelProvider, options) {
    options = options || {};
    options.duplicatableClasses = options.duplicatableClasses || [];
    this.options = options;
    this._extIdentProvider = extIdentProvider;
    this._metamodelProvider = metamodelProvider;
    this._editorElement = this._createContainerElement(parentElement);
    this._clipboard = this._createClipboard(parentElement);
    this._templateProvider = options.templateProvider || new Concrete.TemplateProvider(this._createTemplatesElement(parentElement));
    this._shortReferences = options.shortReferences == true ? true : false;
    this.editor = this._createEditor();
    this._modelChanged = false;
    this._saveDiscardDialog = new Concrete.UI.ProceedDialog({
      title: "Discard Changes?",
      message: "The model has not yet been saved. If you continue, your modifications will be lost.",
      proceedButtonText: "Discard Changes"
    });
    this._createModuleDialog = new Concrete.UI.CreateModuleDialog();
  },

  _createContainerElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div class='ct_editor ct_module_editor'></div>"
    });
    return parentElement.childElements().last();
  },

  _createTemplatesElement: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<div style='display: none'></div>"
    });
    return parentElement.childElements().last();
  },

  _createClipboard: function(parentElement) {
    Element.insert(parentElement, { bottom: 
      "<textarea class='ct_clipboard_area' cols='80' rows='10' wrap='off'></textarea>"
    });
    return new Concrete.Clipboard(parentElement.childElements().last());
  },

  handleEvent: function(event) {
    this.editor.handleEvent(event);
  },

  select: function(module, ident) {
    if (module == this.currentModule) {
      if (ident) this._selectElementByIdentifier(ident);
      this.editor.focus();
    }
    else {
      var dowork = function() {
        this.currentModule = module;
        this._editorElement.innerHTML = "";
        this.editor = this._createEditor(module);
        this._loadModule(module, ident);
        this.editor.focus();
      }.bind(this);

      if (this._modelChanged) {
        this._saveDiscardDialog.open({onProceed: dowork});
      }
      else {
        dowork();
      }
    }
  },

  createModule: function(options) {
    var dowork = function() {
      this._createModuleDialog.open({onCreateModule: function(module) {
        new Ajax.Request("/createModule", {
          method: 'get',
          parameters: {"module": module},
          onSuccess: function(transport) {
            this.select(module);
            if (options.onSuccess) options.onSuccess();
          }.bind(this),
          onFailure: function() {
            if (options.onFailure) options.onFailure();
          }
        });
      }.bind(this)});
    }.bind(this);

    if (this._modelChanged) {
      this._saveDiscardDialog.open({onProceed: dowork});
    }
    else {
      dowork();
    }
  },

  save: function(options) {
    if (!this.currentModule) return;
    new Ajax.Request("/storeModule", {
      method: 'post',
      postBody: this.currentModule + "\n" + this.editor.getModel(),
      onSuccess: function() {
        this._modelChanged = false;
        if (options.onSuccess) options.onSuccess();
      }.bind(this),
      onFailure: function() {
        if (options.onFailure) options.onFailure();
      }
    });
  },

  toggleShortReferences: function() {
    this._shortReferences = !this._shortReferences;
    this._setDisplayValueProvider(this.editor.modelInterface);
    this.editor.modelInterface.redrawDisplayValues();
  },
  
  _loadModule: function(module, ident) {
    var editor = this;
    new Ajax.Request("/loadModule", {
      method: "get",
      parameters: {"module": module},
      onSuccess: function(transport) {
        if (transport.responseText.isJSON()) {
          editor.editor.setModel(transport.responseText);
          editor._selectElementByIdentifier(ident);
          editor._modelChanged = false;
        }
      },
      onException: function(request, exception) {
        throw exception;
      }
    });
  },

  _createEditor: function(module) {
    var ip = new Concrete.QualifiedNameBasedIdentifierProvider({nameAttribute: this.options.identifierAttribute});
    var _this = this;
    var rootClasses = this.options.rootClasses ? 
      this.options.rootClasses.collect(function(c) { return this._metamodelProvider.metaclassesByName[c]; }, this) :
      this._metamodelProvider.metaclasses;
    var duplicatableClasses = this.options.duplicatableClasses.collect(function(c) { return this._metamodelProvider.metaclassesByName[c]; }, this);
    var ed = null;	// (to placate uninitialized warning on self-reference on line 160)
    ed = new Concrete.Editor(this._editorElement, this._templateProvider, this._metamodelProvider, ip, {
      clipboard: this._clipboard, 
      externalIdentifierProvider: this._extIdentProvider, 
      externalModule: module,
      constraintChecker: new Concrete.ConstraintChecker(rootClasses, ip, 
        {externalIdentifierProvider: this._extIdentProvider, 
         externalModule: module,
         allowDuplicates: duplicatableClasses}),
      followReferenceSupport: false,
      onFollowReference: function(ref, target) {
        var ident = ed.identifierProvider.getIdentifier(target);
        _this.options.onFollowReference(_this.currentModule, ident);
      },
      onFollowExternalReference: function(module, ident) {
        _this.options.onFollowReference(module, ident);
      },
      rootClasses: rootClasses,
      });
    ed.modelInterface.addModelChangeListener(this);
    this._setDisplayValueProvider(ed.modelInterface);
    return ed;
  },

  _setDisplayValueProvider: function(modelInterface) {
    var dvp = null;
    if (this._shortReferences) {
      dvp = function(text, feature) {
        if (feature.mmFeature.isReference()) {
          return text.toString().split("/").last();
        }
        else {
          return text;
        }
      };
    }
    else {
      dvp = function(text, feature) {
        return text;
      };
    } 
    modelInterface.setDisplayValueProvider(dvp);
  },

  _selectElementByIdentifier: function(ident) {
    var target = this.editor.identifierProvider.getElement(ident);
    if (target) {
      this.editor.selector.selectDirect(target);
    }
  },

  // ModelChangeListener Interface
  elementAdded: function(element) {
  },

  elementChanged: function(element, feature) {
  },

  elementRemoved: function(element) {
  },

  rootChanged: function(root) {
  },

  commitChanges: function() {
    this._modelChanged = true;
  }

});


