// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Editor = Class.create({

  // Options:
  //   readOnlyMode: if set, the model can not be modified via user events, default: false
  //   clipboard:    if a DOM node is provided it is used as clipboard, default: internal clipboard
  //   rootClasses:  set of classes which can be instantiated on root level, default: all 
  //   externalIdentifierProvider:
  //                 an object providing access to identifiers of objects which are not
  //                 part of the model being edited in this instance of the editor, default: none
  //   constraintChecker:
  //                 a custom constraint checker, default: none (built-in constraint checker)
  //   externalModule:
  //                 name of the external module which represents the module being edited
  //                 by this instance of the editor (see externalIdentifierProvider)
  //                 if set, external identifiers from the named module will be ignored, default: none
  //   followReferenceSupport:
  //                 if set to true, this editor will provide the functionality to follow references
  //                 and to step back and forward in the jump history, default: true
  //   onFollowReference:
  //                 a function which will be called when a reference is invoked
  //                 it gets two arguments, the source reference element and the target element, default: none
  //   onFollowExternalReference:
  //                 a function which will be called when an external reference is invoked, 
  //                 it gets two arguments, the module (provided by the identifier provider) and the identifier,
  //                 if not defined, external references can not be followed, default: none
  //   scrolling:    specifies if the current element should scroll into view
  //                 possible values: none, horizontal, vertical, both, default: both
  //   selector:     if a selector is provided, use this instead of the internal selector, default: none
  //   showInfoPopups:
  //                 if set to true, show information about element/values in a popup, default: true
  //   dirtyListeners:
  //                 an array of listeners whose update() method is called whenever the dirty state
  //                 of the model that's edited changes to 'dirty'/true
  initialize: function(editorRoot, templateProvider, metamodelProvider, identifierProvider, options) {
    options = options || {};
    this.options = options;
    if (options.readOnlyMode == undefined) options.readOnlyMode = false;
    if (options.followReferenceSupport == undefined) options.followReferenceSupport = true;
    if (options.showInfoPopups == undefined) options.showInfoPopups = true;
    options.scrolling = options.scrolling || "both";
    if (options.dirtyListeners == undefined) options.dirtyListeners = [];
    this.editorRoot = editorRoot;
    this._setupRoot();
    this.templateProvider = templateProvider;
    this.metamodelProvider = metamodelProvider;
    this.identifierProvider = identifierProvider;
    this._createInlineEditor();
    this.modelInterface = new Concrete.ModelInterface(this.modelRoot, this.templateProvider, this.metamodelProvider);
    this.modelInterface.addModelChangeListener(this.identifierProvider);
    this.rootClasses = options.rootClasses || this.metamodelProvider.metaclasses;
    this.maxRootElements = -1;
    this.externalIdentifierProvider = options.externalIdentifierProvider;
    this.constraintChecker = options.constraintChecker || 
      new Concrete.ConstraintChecker(this.rootClasses, this.identifierProvider, 
        {externalIdentifierProvider: this.externalIdentifierProvider, 
         externalModule: options.externalModule});
    this.constraintChecker.setModelRoot(this.modelRoot);
    this.modelInterface.addModelChangeListener(this.constraintChecker);
    this.modelRoot.insert({top: this.templateProvider.emptyElement(this.modelRoot)});
    this.selector = options.selector || new Concrete.Selector(); 
    this._setupSelector(this.selector);
    this.selector.selectDirect(this.modelRoot.down());
    this.adjustMarker();
    this.jumpStack = [];
    this.clipboard = options.clipboard || new Concrete.Clipboard();
    this.onFollowReference = options.onFollowReference;
    this.onFollowExternalReference = options.onFollowExternalReference;
    this._hasFocus = false;
    this.showDocumentationPopups = true;
    this.dirtyState = false;
  },

  /**
   * Sets the dirty state to the given value or to 'dirty'/true if no value is
   * given.
   */
  _setDirtyState: function(state) {
    this.dirtyState = ( typeof(state) == 'undefined' ) ? true : !!state;
    var dirtyState = this.dirtyState;
    this.options.dirtyListeners.forEach(function(l) { l.update(dirtyState); });
  },

  _setupRoot: function() {
    this.editorRoot.insert({top: "<div class='ct_root'></div>"});
    this.modelRoot = this.editorRoot.childElements().first();
    this.editorRoot.insert({bottom: "<div style='position: absolute; left: 0; top: 0' class='ct_cursor'></div>"});
    this.marker = this.editorRoot.childElements().last();
    this.editorRoot.insert({bottom: "<div style='position: fixed; display: none; left: 0; top: 0;' class='ct_message_popup'></div>"});
    this.popup = this.editorRoot.childElements().last();
  },

  _createInlineEditor: function() {
    var marker = this.marker;
    this.inlineEditor = new Concrete.InlineEditor(function(isActive) {
      if (isActive) {
        marker.hide();
      }
      else {
        marker.show();
      }
    });
  },

  _setupSelector: function(selector) {
    var editor = this;
    selector.setOnChangeFunction(
      function(oldNode, newNode) {
        if (editor.options.scrolling != "none") Concrete.Scroller.scrollTo(newNode, editor.options.scrolling);
        if (oldNode && newNode != oldNode) {
          var oa = oldNode.ancestors();
          oa.unshift(oldNode);
          var na = newNode.ancestors();
          na.unshift(newNode);
          oa.reverse().each(function(n) {
            if (n != na.pop() && n.isElement()) {
              editor.hideEmptyFeatures(n);
            }
          });
        }
        editor.adjustMarker();
      });
  },

  focus: function() {
    this._hasFocus = true;
  },

  handleEvent: function(event) {
    var element = event.element();
    if( event.type == "click" && event.isLeftClick() ) {
      // check whether the event occurred on an element that is contained by the editor:
      if( element.ancestors().concat(element).include(this.editorRoot) ) {
        this._hasFocus = true;
        this.editorRoot.addClassName("ct_focus");
      } else {
        this._hasFocus = false;
        this.editorRoot.removeClassName("ct_focus");
      }
    }
    if( !this._hasFocus ) return;

    if( event.type == "mousemove" ) {
      this._handleErrorPopups(event);
      if( this.options.showInfoPopups ) {
        this._handleInfoPopups(event);
      }
      this._handleRefHighlight(event);
      this.popup.setStyle({left: event.clientX + 20 + 'px', top: event.clientY + 20 + 'px'});
    }

    if( this.inlineEditor.isActive ) {
      // left mouse click?:
      if( event.type == "click" && event.isLeftClick() ) {
        if( !element.up().hasClassName("ct_inline_editor") ) {
          this.inlineEditor.cancel();
          this.selector.selectDirect(element);
        }
      }
      // Tab?:
      else if( event.keyCode == 9 ) {
        this.inlineEditor.finish();
        this.selector.selectTab( event.shiftKey ? "prev" : "next" );
        event.stop();
      }
      // Return?:
      else if( event.keyCode == 13 ) {
        this.inlineEditor.finish();
        event.stop();
      }
      // Escape?:
      else if( event.keyCode == 27 ) {
        this.inlineEditor.cancel();
        event.stop();
      }
    }
    // inline editor not active:
    else {
      var ctrlKey = this._ctrlKey(event);
      // left mouse click?:
      if( event.type == "click" && event.isLeftClick() ) {
        // clicked fold button?:
        if( element.hasClassName("ct_fold_button") ) {
          this.toggleFoldButton(element);
        }
        // follow reference?:
        else if( ctrlKey ) {
          this.jumpReference(element);
        }
        // ??
        else if( this.selector.selected == this.selector.surroundingSelectable(element) ) {
          this.runCommand("edit_event");
        }
        // ??
        else {
          this.selector.selectDirect(element, event.shiftKey);
          event.stop();
        }
      }
      else if( event.keyCode == Event.KEY_LEFT && ctrlKey ) {
        // Ctrl-Shift-Left?:
        if( event.shiftKey ) {
          this.runCommand("collapse_recursive_event");
        }
        // Ctrl-Left?:
        else {
          this.runCommand("collapse_event");
        }
        event.stop();
      }
      // Ctrl-Shift-Right?:
      else if( event.keyCode == Event.KEY_RIGHT && ctrlKey ) {
        // Ctrl-Right?:
        if( event.shiftKey ) {
          this.runCommand("expand_recursive_event");
        }
        // Ctrl-Right?:
        else {
          this.runCommand("expand_event");
        }
        event.stop();
      }
      else if( event.keyCode == Event.KEY_LEFT && event.altKey ) {
        if( this.options.followReferenceSupport ) {
          this.runCommand("jump_backward_event");
          event.stop();
        }
      }
      else if( event.keyCode == Event.KEY_RIGHT && event.altKey)  {
        if (this.options.followReferenceSupport) {
          this.runCommand("jump_forward_event");
          event.stop();
        }
      }
      else if( event.keyCode == Event.KEY_UP ) {
        this.selector.selectCursor("up", event.shiftKey);
        event.stop();
      }
      else if( event.keyCode == Event.KEY_DOWN ) {
        this.selector.selectCursor("down", event.shiftKey);
        event.stop();
      }
      else if( event.keyCode == Event.KEY_LEFT ) {
        this.selector.selectCursor("left", event.shiftKey);
        event.stop();
      }
      else if( event.keyCode == Event.KEY_RIGHT ) {
        this.selector.selectCursor("right", event.shiftKey);
        event.stop();
      }
      // Tab?:
      else if( event.keyCode == 9 ) {
        this.selector.selectTab( event.shiftKey ? "prev" : "next" );
        event.stop();
      }
      // Ctrl-Space?:
      else if( event.keyCode == 32 && ctrlKey ) {
        this.runCommand("edit_event");
        event.stop();
      }
      // F2?:
      else if( event.keyCode == 113 ) {
        this.runCommand("edit_event");
        event.stop();
      }
      // Delete?:
      else if( event.keyCode == 46 ) {
        this.runCommand("delete_event");
        event.stop();
      }
      // Shift-Return?:
      else if( event.shiftKey && event.keyCode == 13 ) {
        this.runCommand("show_hidden_event");
        event.stop();
      }
      // Return?:
      else if( event.keyCode == 13 ) {
        this.runCommand("insert_event");
        event.stop();
      }
      // Ctrl-A?:
      else if( event.keyCode == 65 && ctrlKey ) {
        this.selector.selectDirect(this.modelRoot.childElements().first(), false);
        this.selector.selectDirect(this.modelRoot.childElements().last(), true);
        event.stop();
      }
      // Ctrl-C?:
      else if( event.keyCode == 67 && ctrlKey ) {
        this.runCommand("copy_event");
        event.stop();
      }
      // Ctrl-V?:
      else if( event.keyCode == 86 && ctrlKey ) {
        this.runCommand("paste_event");
        event.stop();
      }
      // Ctrl-X?:
      else if( event.keyCode == 88 && ctrlKey ) {
        this.runCommand("cut_event");
        event.stop();
      }
      else if( (event.keyCode >= 65 && event.keyCode <= 90) ||   // a - z
               (event.keyCode >= 48 && event.keyCode <= 57) ) {  // 0 - 9
        this.runCommand("edit_event");
      }
    }
  },

  _ctrlKey: function(event) {
    var onMac = ( navigator.userAgent.indexOf('Mac') > -1 );
    return( onMac ? event.metaKey : event.ctrlKey );
  },

  _handleErrorPopups: function(event) {
    var element = event.element();
    var errorElement = (element.hasClassName("ct_error")) ? element : element.up(".ct_error");
    if (errorElement && (errorElement.up(".ct_editor") == this.editorRoot)) {
      var desc = errorElement.childElements().find(function(e) { return e.hasClassName("ct_error_description"); });
      if (desc) {
        this._setPopupMessage("error_desc", "error", desc.innerHTML);
      }
    }
    else {
      this._resetPopupMessage("error_desc");
    }    
  },

  _handleInfoPopups: function(event) {
    var element = event.element();
    this._resetPopupMessage("feature_name");
    this._resetPopupMessage("reference_value");
    this._resetPopupMessage("reference_module");
    this._resetPopupMessage("documentation");
    if( element.up(".ct_editor") != this.editorRoot ) {
      return;
    }
    if( element.hasClassName("ct_value") ) {
      var feature = element.mmFeature();
      this._setPopupMessage("feature_name", "info", "Feature: " + feature.name);
      if( feature.isReference() && element.value ) {
        this._setPopupMessage("reference_value", "info", "Reference to: " + element.value);
        if (this.externalIdentifierProvider) {
          var ei = this.externalIdentifierProvider.getElementInfo(element.value);
          if( ei && ei.module != this.options.externalModule ) {
            this._setPopupMessage("reference_module", "info", "In module: " + ei.module);
          }
        }
      }
      if( this.showDocumentationPopups && feature.documentation ) {
        this._setPopupMessage("documentation", "info", "Documentation: " + feature.documentation);
      }
    } else {
      if( this.showDocumentationPopups && element.hasClassName("ct_class_name") ) {
        var clazzElt = element.up(".ct_element");
        if( clazzElt && clazzElt.mmClass.documentation ) {
          this._setPopupMessage("documentation", "info", "Documentation: " + clazzElt.mmClass.documentation);
        }
      }
    }
  },

  _setPopupMessage: function(ident, kind, content) {
    this._popupMessages = this._popupMessages || {};
    var msg = this._popupMessages[ident];
    var clazz = kind == "error" ? "ct_error_message" : "ct_info_message";
    if (!msg) {
      Element.insert(this.popup, {bottom: "<div class='"+clazz+"'>"+content+"</div>"});
      msg = this.popup.childElements().last();
    }
    else {
      msg.className = clazz;
      msg.innerHTML = content;
    }
    this._popupMessages[ident] = msg;
    this.popup.show();
  },

  _resetPopupMessage: function(ident) {
    this._popupMessages = this._popupMessages || {};
    var msg = this._popupMessages[ident];
    if (msg) {
      msg.remove();
      this._popupMessages[ident] = undefined;
    }
    if (this.popup.childElements().size() == 0) this.popup.hide();
  },

  _handleRefHighlight: function(event) {
    var element = event.element();
    if (this.refHighlight) {
      this.refHighlight.source.removeClassName("ct_ref_source");
      if (this.refHighlight.target) this.refHighlight.target.removeClassName("ct_ref_target");
      this.refHighlight = undefined;
    }
    if(    this._ctrlKey(event)
        && element.hasClassName("ct_value")
        && !element.hasClassName("ct_empty")
        && element.mmFeature().isReference() )
    {
      var targets = this.identifierProvider.getElement(element.value);
      if (!(targets instanceof Array)) targets = [targets].compact();
      if (this.externalIdentifierProvider) {
        var ei = this.externalIdentifierProvider.getElementInfo(element.value);
        if (ei) {
          // here we add a type instead of an element
          targets = targets.concat(ei.type);
        }
      }
      if (targets.size() > 0) {
        // highlight the first reference
        element.addClassName("ct_ref_source");
        var target = null;
        if (targets[0].mmClass) {
          // if target is an element in this editor
          target = targets[0]; 
          target.addClassName("ct_ref_target");
        }
        this.refHighlight = {source: element, target: target};
      }
    }    
  },

  runCommand: function(eventId) {
    var se = this.selector.selected;
    var cmd = Concrete.Editor.Commands.select(function(c) { 
      return (!this.options.readOnlyMode || c.readOnly) && c.enable && c.enable(se, this) && c.trigger == eventId;
    }, this).first();
    if (cmd) {
      cmd.run(se, this);
    }
  },

  allSelected: function() {
    return this.selector.multiSelected.concat(this.selector.selected).uniq();
  },

  // assumption all nodes have the same parent
  removeElements: function(nodes) {
    if (nodes.first().siblings().select(function(s){ return s.hasClassName("ct_element"); }).size() == nodes.size()-1) {
      nodes.last().insert({after: this.templateProvider.emptyElement(nodes.last().parentNode, nodes.last().feature())});
    }
    if (nodes.last().next()) {
      this.selector.selectDirect(nodes.last().next());
    }
    else {
      this.selector.selectDirect(nodes.first().previous());
    }
    this.modelInterface.removeElement(nodes);
    this.adjustMarker();
  },

  hideEmptyFeatures: function(n) {
    n.findFirstDescendants(["ct_attribute", "ct_reference", "ct_containment"], ["ct_element"]).each(function(f) {
      if (Concrete.Editor.CommandHelper.canAutoHide(f)) {
        f.hide();
      }
    });
    this.adjustMarker();
  },

  showHiddenFeatures: function(n) {
    // expand to make fold button state consistent (code below will show all features)
    this.expandElement(n);
    n.findFirstDescendants(["ct_attribute", "ct_reference", "ct_containment"], ["ct_element"]).each(function(f) {
      this.showHiddenFeature(f);
    }, this);
    this.adjustMarker();
  },

  showHiddenFeature: function(f) {
    f.show();
    var slot = f.down(".ct_slot");
    if (slot.childElements().size() == 0) {
      if (f.mmFeature.isContainment()) {
        slot.insert({bottom: this.templateProvider.emptyElement(slot, f)});
      }
      else {
        slot.insert({bottom: this.templateProvider.emptyValue(f)});
      }
    }
  },

  toggleFoldButton: function(fb) {
    if (fb.hasClassName("ct_fold_open")) {
      this.collapseElement(fb.up(".ct_element"));
    }
    else if (fb.hasClassName("ct_fold_closed")) {
      this.expandElement(fb.up(".ct_element"));
    }
  },

  collapseElement: function(n) {
    n.features.each(function(f) {
      if (f.mmFeature.isContainment()) f.hide();
    });
    if (n.foldButton) {
      n.foldButton.removeClassName("ct_fold_open");
      n.foldButton.addClassName("ct_fold_closed");
    }
    this.adjustMarker();
    // TODO  check whether view info changes and set dirty status if so
  },

  expandElement: function(n) {
    n.features.each(function(f) {
      if (f.mmFeature.isContainment() && !Concrete.Editor.CommandHelper.canAutoHide(f)) {
        f.show();
      }
    });
    if (n.foldButton) {
      n.foldButton.removeClassName("ct_fold_closed");
      n.foldButton.addClassName("ct_fold_open");
    }
    this.adjustMarker();
    // TODO  check whether view info changes and set dirty status if so
  },

  collapseElementRecursive: function(n) {
    n.select(".ct_element").each(function(e) {
      this.collapseElement(e);
    }, this);
    this.collapseElement(n);
    // TODO  check whether view info changes and set dirty status if so
  },

  expandElementRecursive: function(n) {
    n.select(".ct_element").each(function(e) {
      this.expandElement(e);
    }, this);
    this.expandElement(n);
    // TODO  check whether view info changes and set dirty status if so
  },

  // expands the parent elements of an element or attribute/reference value
  expandParentElements: function(n) {
    if (!n.mmClass) {
      // node is a value, expand parents of containing element
      n = n.up(".ct_element");
    }
    var parentElements = n.ancestors().select(function(a) {return a.mmClass;});
    parentElements.each(function(e) {
      if (e.foldButton && e.foldButton.hasClassName("ct_fold_closed")) {
        this.expandElement(e);
      }
    }, this);
  },

  copyToClipboard: function(nodes, editor) {
    if (nodes.first().hasClassName("ct_value")) {
      // in case of a value, we expect only one node
      this.clipboard.write(nodes.first().value);
    }
    else {
      this.clipboard.write(nodes.collect(function(n) { return this.modelInterface.extractModel(n); }, this));
    }
  },

  jumpReference: function(n) {
    if (!n.hasClassName("ct_value") || !n.mmFeature().isReference()) return;
    var target = this.identifierProvider.getElement(n.value);
    if (target && !(target instanceof Array)) {
      if (this.onFollowReference) this.onFollowReference(n, target);
      if (this.options.followReferenceSupport) {
        this.jumpStack.push(n);
        this.selector.selectDirect(target);
      }
    }
    else {
      var ei = this.externalIdentifierProvider && this.externalIdentifierProvider.getElementInfo(n.value);
      if (ei && this.onFollowExternalReference) {
        this.onFollowExternalReference(ei.module, n.value);
      }
    }
  },

  adjustMarker: function() {
    var cur = this.selector.getCursorPosition();
    var poff = this.marker.getOffsetParent().cumulativeOffset();
    this.marker.setStyle( {
        left: (cur.x - poff.left - this.editorRoot.scrollLeft) + 'px',
        top: (cur.y - poff.top - this.editorRoot.scrollTop) + 'px'}
      );
    // cursor follows scrolling
    // TODO  make cursor invisible when outside of visible area
      if (cur.yratio < 0.5) {
        this.marker.addClassName("ct_cursor_top");
        this.marker.removeClassName("ct_cursor_bottom");
      }
      else {
        this.marker.addClassName("ct_cursor_bottom");
        this.marker.removeClassName("ct_cursor_top");
      }
      if (cur.xratio < 0.5) {
        this.marker.addClassName("ct_cursor_left");
        this.marker.removeClassName("ct_cursor_right");
      }
      else {
        this.marker.addClassName("ct_cursor_right");
        this.marker.removeClassName("ct_cursor_left");
      }
  },

  getModel: function() {
    return Concrete.Helper.prettyPrintJSON(
      Object.toJSON(this.modelRoot.childElements().collect(function(n) { return this.modelInterface.extractModel(n); }, this)));
  },

  setModel: function(model) {
    if( Object.isString(model) && model.isJSON()) {
      model = model.evalJSON();
    } // else: assume nothing has to be done
    this.modelInterface.removeElement(this.modelRoot.childElements());
    this.modelInterface.createElement(this.modelRoot, "bottom", model);
    this.selector.selectDirect(this.modelRoot.down());
  }
});

Concrete.Editor.CommandHelper = {

  referenceOptions: function(type, editor) {
    var idents = editor.modelInterface.elements()
      .select(function(e) { return editor.constraintChecker.isValidInstance(type, e);})
      .collect(function(e) { return editor.identifierProvider.getIdentifier(e); });
    if (editor.externalIdentifierProvider) {
      idents = idents.concat(editor.externalIdentifierProvider.getIdentifiers(type));
    }
    return idents.select(function(i) { return( i && i.length > 0 ); });
  },

  canAutoHide: function(feature) {
    return (!feature.hasClassName("ct_error") &&
      (feature.hasClassName("ct_always_hide") || 
      (feature.hasClassName("ct_auto_hide") && (feature.down(".ct_slot").childElements().select(function(e) { return !e.hasClassName("ct_empty"); }).size() == 0))));
    },

  canAddElement: function(slot, editor) {
    var numElements = slot.childElements().select(function(c){ return c.hasClassName("ct_element"); }).size();
    if (slot.hasClassName("ct_root")) {
      return editor.maxRootElements == -1 || numElements < editor.maxRootElements;
    }
    else {
      return slot.mmFeature().upperLimit == -1 || numElements < slot.mmFeature().upperLimit;
    }
  },

  showAllNonAutoHideFeatures: function(n, editor) {
    n.select(".ct_attribute, .ct_reference, .ct_containment").each(function(f) {
      if( !Concrete.Editor.CommandHelper.canAutoHide(f) ) {
        editor.showHiddenFeature(f);
      }
    });
  },

  removeValue: function(n, editor) {
    if (n.siblings().select(function(s){ return s.hasClassName("ct_value"); }).size() == 0) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
    }
    if (n.next()) {
      editor.selector.selectDirect(n.next());
    }
    else {
      editor.selector.selectDirect(n.previous());
    }
    editor.modelInterface.removeValue(n);
    editor.adjustMarker();
  }

};

Concrete.Editor.Commands = [

  {
    name: "Edit Attribute",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isAttribute();
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, {
        init: n.value,
        options: editor.constraintChecker.attributeOptions(n.mmFeature()),
        onSuccess: function(v) {
          if (n.hasClassName("ct_empty")) {
            editor.modelInterface.createValue(n, "after", v);
            editor.selector.selectDirect(n.next());
            n.remove();
          }
          else {
            editor.modelInterface.changeValue(n, v);
          }
          editor.adjustMarker();
          if( n.value != v ) {
        	  editor._setDirtyState();
          }
        }
      });
    }
  },

  {
    name: "Add Attribute",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isAttribute() &&
        (n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value"); }).size()+1 < n.mmFeature().upperLimit);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "",
        options: editor.constraintChecker.attributeOptions(n.mmFeature()),
        onSuccess: function(v) {
          temp.remove();
          editor.modelInterface.createValue(n, "after", v);
          editor.selector.selectDirect(n.next());
          editor._setDirtyState();
        }, 
        onFailure: function() {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Attribute",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isAttribute();
    },
    run: function(n, editor) {
      Concrete.Editor.CommandHelper.removeValue(n, editor);
      editor._setDirtyState();
    }
  },

  {
    name: "Edit Reference",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, { init: n.value, partial: true,
        options: Concrete.Editor.CommandHelper.referenceOptions(n.mmFeature().type, editor),
        onSuccess: function(v) {
          if (n.hasClassName("ct_empty")) {
            editor.modelInterface.createValue(n, "after", v);
            editor.selector.selectDirect(n.next());
            n.remove();
          }
          else {
            editor.modelInterface.changeValue(n, v);
          }
          editor.adjustMarker();
          if( n.value != v ) {
            editor._setDirtyState();
          }
        }
      });
    }
  },

  {
    name: "Add Reference",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isReference() &&
        (n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value"); }).size()+1 < n.mmFeature().upperLimit);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyValue(n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "", partial: true,
        options: Concrete.Editor.CommandHelper.referenceOptions(temp.mmFeature().type, editor),
        onSuccess: function(v) {
          temp.remove();
          editor.modelInterface.createValue(n, "after", v);
          editor.selector.selectDirect(n.next());
          editor._setDirtyState();
        }, 
        onFailure: function() {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Reference",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      Concrete.Editor.CommandHelper.removeValue(n, editor);
      editor._setDirtyState();
    }
  },

  {
    name: "Create Element",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.inlineEditor.edit(n, { init: "", partial: false,
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          editor.modelInterface.createElement(n, "after", {_class: v});
          editor.showHiddenFeatures(n.next());
          editor.selector.selectDirect(n.next());
          n.remove();
          editor.adjustMarker();
          editor._setDirtyState();
        }
      });
    }
  },

  {
    name: "Replace Element",
    trigger: "edit_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      var handle = n.findFirstDescendants(["ct_handle"], ["ct_element"]).first() || n;
      editor.inlineEditor.edit(handle, { init: n.mmClass.name,
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          var data = editor.modelInterface.extractModel(n);
          data._class = v;
          editor.modelInterface.createElement(n, "after", data);
          editor.selector.selectDirect(n.next());
          editor.modelInterface.removeElement(n);
          editor.adjustMarker();
          editor._setDirtyState();
        }
      });
    }
  },

  {
    name: "Add Element",
    trigger: "insert_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty") && Concrete.Editor.CommandHelper.canAddElement(n.up(), editor);
    },
    run: function(n, editor) {
      n.insert({after: editor.templateProvider.emptyElement(n.parentNode, n.feature())});
      var temp = n.next();
      editor.selector.selectDirect(temp);
      editor.inlineEditor.edit(temp, { init: "",
        options: editor.constraintChecker.elementOptions(n.up()),
        onSuccess: function(v) {
          editor.modelInterface.createElement(n, "after", {_class: v});
          editor.selector.selectDirect(n.next());
          editor.showHiddenFeatures(n.next());
          temp.remove();
          editor.adjustMarker();
          editor._setDirtyState();
        },
        onFailure: function(v) {
          temp.remove();
          editor.selector.selectDirect(n);
        }
      });
    }
  },

  {
    name: "Remove Element",
    trigger: "delete_event",
    enable: function(n, editor) {
      return n.hasClassName("ct_element") && !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.removeElements(editor.allSelected());
      editor._setDirtyState();
    }
  },

  {
    name: "Hide Empty Features",
    trigger: "hide_empty_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.hideEmptyFeatures(s);
      });
    }
  },

  {
    name: "Show Hidden Features",
    trigger: "show_hidden_event",
    readOnly: true,
    enable: function(n, editor) {
      return true;
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.showHiddenFeatures(s.findAncestorOrSelf(["ct_element"]));
      });
    }
  },  

  {
    name: "Collapse Element",
    trigger: "collapse_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.collapseElement(s);
      });
    }
  },

  {
    name: "Expand Element",
    trigger: "expand_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.expandElement(s);
      });
    }
  },

  {
    name: "Collapse Element Recursive",
    trigger: "collapse_recursive_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.collapseElementRecursive(s);
      });
    }
  },

  {
    name: "Expand Element Recursive",
    trigger: "expand_recursive_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_element");
    },
    run: function(n, editor) {
      editor.allSelected().each(function(s) {
        editor.expandElementRecursive(s);
      });
    }
  },

  {
    name: "Copy",
    trigger: "copy_event",
    readOnly: true,
    enable: function(n, editor) {
      return !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.copyToClipboard(editor.allSelected());
    }
  },

  {
    name: "Cut",
    trigger: "cut_event",
    enable: function(n, editor) {
      return !n.hasClassName("ct_empty");
    },
    run: function(n, editor) {
      editor.copyToClipboard(editor.allSelected());
      if (n.hasClassName("ct_value")) {
        Concrete.Editor.CommandHelper.removeValue(n, editor);
      }
      else {
        editor.removeElements(editor.allSelected());
      }
      editor._setDirtyState();
    }
  },

  {
    name: "Paste",
    trigger: "paste_event",
    enable: function(n, editor) {
      return (n.hasClassName("ct_element") && editor.clipboard.containsElement()) ||
        (n.hasClassName("ct_value") && editor.clipboard.containsValue());
    },
    run: function(n, editor) {
      var data = editor.clipboard.read();
      if (!(data instanceof Array)) data = [ data ];
      if (n.hasClassName("ct_element")) {
        editor.modelInterface.createElement(n, "after", data);
        var created = n.next();
        data.each(function(d) {
          Concrete.Editor.CommandHelper.showAllNonAutoHideFeatures(created, editor);
          created = created.next();
        });
        editor.selector.selectDirect(n.next());
        if (n.hasClassName("ct_empty")) n.remove();
      }
      else {
        editor.modelInterface.createValue(n, "after", data);
        editor.selector.selectDirect(n.next());
        if (n.hasClassName("ct_empty")) n.remove();
      }
      editor.adjustMarker();
      editor._setDirtyState();
    }
  },

  {
    name: "Jump Reference",
    trigger: "jump_forward_event",
    readOnly: true,
    enable: function(n, editor) {
      return n.hasClassName("ct_value") && n.mmFeature().isReference();
    },
    run: function(n, editor) {
      editor.jumpReference(n);
    }
  },

  {
    name: "Jump Reference Back",
    trigger: "jump_backward_event",
    readOnly: true,
    enable: function(n, editor) {
      return true;
    },
    run: function(n, editor) {
      if (editor.jumpStack.size() > 0) {
        editor.selector.selectDirect(editor.jumpStack.pop());
      }
    }
  }

];
