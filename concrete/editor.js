// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Editor = Class.create({

  // Options:
  //   readOnlyMode: if set, the model can not be modified via user events, default: false
  //   clipboard:    if a DOM node is provided it is used as clipboard, default: internal clipboard
  //   rootClasses:  set of classes which can be instaniated on root level, default: all 
  //   externalIdentifierProvider: 
  //                 an object providing access to identifiers of objects which are not
  //                 part of the model being edited in this instance of the editor, default: none
  //   followReferenceSupport:
  //                 if set to true, this editor will provide the functionality to follow references
  //                 and to step back and forward in the jump history, default: true
  //   onFollowReference:
  //                 a function which will be called when a reference is invoked
  //                 it gets two argments, the source reference element and the target element, default: none
  //   onFollowExternalReference:
  //                 a function which will be called when an external reference is invoked, 
  //                 it gets two arguments, the module (provided by the identifier provider) and the identifier,
  //                 if not defined, external references can not be followed, default: none
  //   scrolling:    specifies if the current element should scroll into view
  //                 possible values: none, horizontal, vertical, both, default: both
  //                 
  //
	initialize: function(editorRoot, templateProvider, metamodelProvider, identifierProvider, options) {
    this.options = options || {};
    if (this.options.readOnlyMode == undefined) this.options.readOnlyMode = false;
    if (this.options.followReferenceSupport == undefined) this.options.followReferenceSupport = true;
    this.options.scrolling = this.options.scrolling || "both";
		this.editorRoot = editorRoot;
		this._setupRoot();
		this.templateProvider = templateProvider;
		this.metamodelProvider = metamodelProvider;
		this.identifierProvider = identifierProvider;
		this._createInlineEditor();
		this.modelInterface = new Concrete.ModelInterface(this.modelRoot, this.templateProvider, this.metamodelProvider);
		this.modelInterface.addModelChangeListener(this.identifierProvider);
		this.rootClasses = (options && options.rootClasses) || this.metamodelProvider.metaclasses;
		this.maxRootElements = -1;
    this.externalIdentifierProvider = options.externalIdentifierProvider;
		this.constraintChecker = new Concrete.ConstraintChecker(this.modelRoot, this.rootClasses, this.identifierProvider, this.externalIdentifierProvider);
		this.modelInterface.addModelChangeListener(this.constraintChecker);
		this.modelRoot.insert({top: this.templateProvider.emptyElement()});
		this.selector = this._createSelector();
		this.selector.selectDirect(this.modelRoot.down());
		this.adjustMarker();
		this.jumpStack = [];
		this.clipboard = (options && options.clipboard) || new Concrete.Clipboard();
    this.onFollowReference = options.onFollowReference;
    this.onFollowExternalReference = options.onFollowExternalReference;
		this._hasFocus = false;
	},
	
	_setupRoot: function() {
		this.editorRoot.insert({top: "<div class='ct_root'></div>"});
		this.modelRoot = this.editorRoot.childElements().first();
		this.editorRoot.insert({bottom: "<div style='position: absolute; left: 0; top: 0' class='ct_cursor'></div>"});
		this.marker = this.editorRoot.childElements().last();
		this.editorRoot.insert({bottom: "<div style='position: absolute; display: none; left: 0; top: 0;' class='ct_error_popup'></div>"});
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
	
	_createSelector: function() {
		var editor = this;
		return new Concrete.Selector( 
			function(oldNode, newNode) {
				if (editor.options.scrolling != "none") Concrete.Scroller.scrollTo(newNode, editor.options.scrolling);
				if (oldNode) {
					if (!newNode.ancestors().include(oldNode) && newNode != oldNode) {
						editor.hideEmptyFeatures(oldNode);
					}
				}
				editor.adjustMarker();
			});
	},
		
	handleEvent: function(event) {
		if (event.type == "click" && event.isLeftClick()) {
			if (Event.element(event).ancestors().concat(Event.element(event)).include(this.editorRoot)) {
				this._hasFocus = true;
				this.editorRoot.addClassName("ct_focus");
			}
			else {
				this._hasFocus = false;
				this.editorRoot.removeClassName("ct_focus");
			}
		}
		if (!this._hasFocus) return;
		
		if (event.type == "mousemove") {
			this._handleErrorHighlight(event);
			this._handleRefHighlight(event);
		}
		if (this.inlineEditor.isActive) {
			if (event.type == "click" && event.isLeftClick()) {
				this.inlineEditor.cancel()
				this.selector.selectDirect(Event.element(event));	
			}
			else if (event.keyCode == 9) { 	// tab
				this.inlineEditor.finish();
				if (event.shiftKey) {
					this.selector.selectTab("prev");
				}
				else {
					this.selector.selectTab("next");				
				}			
				event.stop();
			}
			else if (event.keyCode == 13) { // return
				this.inlineEditor.finish();
				event.stop();
			}
			else if (event.keyCode == 27) { // esc
				this.inlineEditor.cancel();
				event.stop();				
			}
		}
		else {
			if (event.type == "click" && event.isLeftClick()) {
        if (Event.element(event).hasClassName("ct_fold_button")) {
          this.toggleFoldButton(Event.element(event));
        }
        else if (event.ctrlKey) {
					this.jumpReference(Event.element(event));
				}
				else if (this.selector.selected == this.selector.surroundingSelectable(Event.element(event))) {
					this.runCommand("edit_event");
				}
				else {
					this.selector.selectDirect(Event.element(event), event.shiftKey);
					event.stop();
				}
			}
			else if (event.keyCode == Event.KEY_LEFT && event.ctrlKey) {
				if (event.shiftKey) {
					this.runCommand("collapse_recursive_event")				
				}
				else {
					this.runCommand("collapse_event")					
				}
				event.stop();
			}
			else if (event.keyCode == Event.KEY_RIGHT && event.ctrlKey) {
				if (event.shiftKey) {
					this.runCommand("expand_recursive_event")
				}
				else {
					this.runCommand("expand_event")
				}
				event.stop();
			}
			else if (event.keyCode == Event.KEY_LEFT && event.altKey) {
        if (this.options.followReferenceSupport) {
          this.runCommand("jump_backward_event");
          event.stop();
        }
			}
			else if (event.keyCode == Event.KEY_RIGHT && event.altKey) {
        if (this.options.followReferenceSupport) {
          this.runCommand("jump_forward_event");
          event.stop();
        }
			}
			else if (event.keyCode == Event.KEY_UP) {
				this.selector.selectCursor("up", event.shiftKey);
				event.stop();
			}
			else if (event.keyCode == Event.KEY_DOWN) {
				this.selector.selectCursor("down", event.shiftKey);
				event.stop();
			}
			else if (event.keyCode == Event.KEY_LEFT) {
				this.selector.selectCursor("left", event.shiftKey);
				event.stop();
			}
			else if (event.keyCode == Event.KEY_RIGHT) {
				this.selector.selectCursor("right", event.shiftKey);
				event.stop();
			}
			else if (event.keyCode == 9) { 	// tab 
				if (event.shiftKey) {
					this.selector.selectTab("prev");
				}
				else {
					this.selector.selectTab("next");				
				}					
				event.stop();
			}
			else if (event.keyCode == 32 && event.ctrlKey) { // ctrl space
				this.runCommand("edit_event");
				event.stop();
			}
			else if (event.keyCode == 113) { 	// F2
				this.runCommand("edit_event");
				event.stop();
			}	
			else if (event.keyCode == 46) {		// Del
				this.runCommand("delete_event");
				event.stop();
			}
			else if (event.shiftKey && event.keyCode == 13) {  	// shift return
				this.runCommand("show_hidden_event");
				event.stop();
			}
			else if (event.keyCode == 13) {  	// return
				this.runCommand("insert_event");
				event.stop();
			}
			else if (event.keyCode == 65 && event.ctrlKey) { // ctrl a
				this.selector.selectDirect(this.modelRoot.childElements().first(), false);
				this.selector.selectDirect(this.modelRoot.childElements().last(), true);
				event.stop();
			}
			else if (event.keyCode == 67 && event.ctrlKey) { // ctrl c
				this.runCommand("copy_event");
				event.stop();
			}
			else if (event.keyCode == 86 && event.ctrlKey) { // ctrl v
				this.runCommand("paste_event");
				event.stop();
			}
			else if (event.keyCode == 88 && event.ctrlKey) { // ctrl x
				this.runCommand("cut_event");
				event.stop();
			}
			else if ((event.keyCode >= 65 && event.keyCode <= 90) || 	// a - z
				(event.keyCode >= 48 && event.keyCode <= 57)) {					// 0 - 9
				this.runCommand("edit_event");
			}
		}
	},
	
	_handleErrorHighlight: function(event) {
		var element = Event.element(event);
		var errorElement = (element.hasClassName("ct_error")) ? element : element.up(".ct_error");
		if (errorElement && (errorElement.up(".ct_editor") == this.editorRoot)) {
			this.popup.innerHTML = errorElement.childElements().select(function(e) { return e.hasClassName("ct_error_description")}).first().innerHTML;
			this.popup.setStyle({left: Event.pointerX(event)+20, top: Event.pointerY(event)+20});
			this.popup.show();			
		}
		else {
			this.popup.hide();
		}		
	},
	
	_handleRefHighlight: function(event) {
		var element = Event.element(event);
		if (this.refHighlight) {
			this.refHighlight.source.removeClassName("ct_ref_source");
			if (this.refHighlight.target) this.refHighlight.target.removeClassName("ct_ref_target");
			this.refHighlight = undefined;
		}
		if (event.ctrlKey && element.hasClassName("ct_value") && !element.hasClassName("ct_empty") && element.mmFeature().isReference()) {
			var targets = this.identifierProvider.getElement(element.textContent);
      if (!(targets instanceof Array)) targets = [targets].compact();
      if (this.externalIdentifierProvider) {
        var ei = this.externalIdentifierProvider.getElementInfo(element.textContent);
        if (ei) {
          // here we add a type instead of an element
          targets = targets.concat(ei.type);
        }
      }
      if (targets.size() > 0) {
        // highlight the first reference
        element.addClassName("ct_ref_source");
        if (targets[0].mmClass) {
          // if target is an element in this editor
          var target = targets[0]; 
          target.addClassName("ct_ref_target");
        }
        this.refHighlight = {source: element, target: target};
      }
		}		
	},
	
	runCommand: function(eventId) {
		var se = this.selector.selected
		var cmd = Concrete.Editor.Commands.select(function(c) { 
      return (!this.options.readOnlyMode || c.readOnly) && c.enable && c.enable(se, this) && c.trigger == eventId 
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
		if (nodes.first().siblings().select(function(s){ return s.hasClassName("ct_element")}).size() == nodes.size()-1) {
			nodes.last().insert({after: this.templateProvider.emptyElement()});
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
			f.show();
			var slot = f.down(".ct_slot");
			if (slot.childElements().size() == 0) {
				if (f.mmFeature.isContainment()) {
					slot.insert({bottom: this.templateProvider.emptyElement()});
				}
				else {
					slot.insert({bottom: this.templateProvider.emptyValue()});
				}
			}
		}, this);
		this.adjustMarker();
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
	},	
	
	collapseElementRecursive: function(n) {
		n.select(".ct_element").each(function(e) {
      this.collapseElement(e);
		}, this);
    this.collapseElement(n);
	},
	
	expandElementRecursive: function(n) {
		n.select(".ct_element").each(function(e) {
      this.expandElement(e);
		}, this);
    this.expandElement(n);
	},

	copyToClipboard: function(nodes, editor) {
		if (nodes.first().hasClassName("ct_value")) {
			// in case of a value, we expect only one node
			this.clipboard.write(nodes.first().textContent);
		}
		else {
			this.clipboard.write(nodes.collect(function(n) { return this.modelInterface.extractModel(n); }, this));
		}
	},
	
	jumpReference: function(n) {
		if (!n.hasClassName("ct_value") || !n.mmFeature().isReference()) return;
		var target = this.identifierProvider.getElement(n.textContent);
		if (target && !(target instanceof Array)) {
      if (this.onFollowReference) this.onFollowReference(n, target);
      if (this.options.followReferenceSupport) {
        this.jumpStack.push(n);
        this.selector.selectDirect(target);
      }
		}
    else {
      var ei = this.externalIdentifierProvider && this.externalIdentifierProvider.getElementInfo(n.textContent);
      if (ei && this.onFollowExternalReference) {
        this.onFollowExternalReference(ei.module, n.textContent);
      }
    }
	},
			
	adjustMarker: function() {
		var cur = this.selector.getCursorPosition();
		this.marker.setStyle({left: cur.x, top: cur.y});
	},
	
	getModel: function() {
		return Concrete.Helper.prettyPrintJSON(
			Object.toJSON(this.modelRoot.childElements().collect(function(n) { return this.modelInterface.extractModel(n)}, this)));
	},
	
	setModel: function(json) {
		this.modelInterface.removeElement(this.modelRoot.childElements());
		this.modelInterface.createElement(this.modelRoot, "bottom", json.evalJSON());
		this.selector.selectDirect(this.modelRoot.down());
	}
})

Concrete.Editor.CommandHelper = {
	
	referenceOptions: function(type, editor) {
    var idents = editor.modelInterface.elements().
			select(function(e) { return editor.constraintChecker.isValidInstance(type, e);}).
			collect(function(e) { return editor.identifierProvider.getIdentifier(e); });
    if (editor.externalIdentifierProvider) {
      idents = idents.concat(editor.externalIdentifierProvider.getIdentifiers(type));
    }
	  return idents.select(function(i) {return i && i.length > 0});
  },
		
	canAutoHide: function(feature) {
		return (!feature.hasClassName("ct_error") &&
      (feature.hasClassName("ct_always_hide") || 
			(feature.hasClassName("ct_auto_hide") && (feature.down(".ct_slot").childElements().select(function(e) { return !e.hasClassName("ct_empty"); }).size() == 0))));
		},
		
	canAddElement: function(slot, editor) {
		var numElements = slot.childElements().select(function(c){ return c.hasClassName("ct_element")}).size();
		if (slot.hasClassName("ct_root")) {
			return editor.maxRootElements == -1 || numElements < editor.maxRootElements;
		}
		else {
			return slot.mmFeature().upperLimit == -1 || numElements < slot.mmFeature().upperLimit;	
		}
	},
	
	showAllNonAutoHideFeatures: function(n, editor) {
		n.select(".ct_attribute, .ct_reference, .ct_containment").each(function(f) {
			if (!f.hasClassName("ct_auto_hide") && !f.hasClassName("ct_always_hide")) {
				f.show();
				var slot = f.down(".ct_slot");
				if (slot.childElements().size() == 0) {
					if (f.mmFeature.isContainment()) {
						slot.insert({bottom: editor.templateProvider.emptyElement()});
					}
					else {
						slot.insert({bottom: editor.templateProvider.emptyValue()});
					}
				}
			}
		});		
	},
	
	removeValue: function(n, editor) {
		if (n.siblings().select(function(s){ return s.hasClassName("ct_value")}).size() == 0) {
			n.insert({after: editor.templateProvider.emptyValue()});
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
	
}

Concrete.Editor.Commands = [

	{
		name: "Edit Attribute",
		trigger: "edit_event",
		enable: function(n, editor) {
			return n.hasClassName("ct_value") && n.mmFeature().isAttribute();
		},
		run: function(n, editor) {
			editor.inlineEditor.edit(n, { 
				init: n.textContent, 
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
				}
			});
		}
	},
	
	{
		name: "Add Attribute",
		trigger: "insert_event",
		enable: function(n, editor) {
			return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isAttribute() && 
				(n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value")}).size()+1 < n.mmFeature().upperLimit);
		},
		run: function(n, editor) {
			n.insert({after: editor.templateProvider.emptyValue()});
			var temp = n.next();
			editor.selector.selectDirect(temp);
			editor.inlineEditor.edit(temp, { init: "",
				options: editor.constraintChecker.attributeOptions(n.mmFeature()), 
				onSuccess: function(v) {
					temp.remove();
					editor.modelInterface.createValue(n, "after", v);
					editor.selector.selectDirect(n.next());
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
		}
	},
		
	{
		name: "Edit Reference",
		trigger: "edit_event",
		enable: function(n, editor) {
			return n.hasClassName("ct_value") && n.mmFeature().isReference();
		},
		run: function(n, editor) {
			editor.inlineEditor.edit(n, { init: n.textContent, partial: true, 
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
				}
			});
		}
	},
	
	{
		name: "Add Reference",
		trigger: "insert_event",
		enable: function(n, editor) {
			return n.hasClassName("ct_value") && !n.hasClassName("ct_empty") && n.mmFeature().isReference() && 
				(n.mmFeature().upperLimit == -1 || n.siblings().select(function(s){ return s.hasClassName(".ct_value")}).size()+1 < n.mmFeature().upperLimit);
		},
		run: function(n, editor) {
			n.insert({after: editor.templateProvider.emptyValue()});
			var temp = n.next();
			editor.selector.selectDirect(temp);
			editor.inlineEditor.edit(temp, { init: "", partial: true, 
				options: Concrete.Editor.CommandHelper.referenceOptions(temp.mmFeature().type, editor), 
				onSuccess: function(v) {
					temp.remove();
					editor.modelInterface.createValue(n, "after", v);
					editor.selector.selectDirect(n.next());
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
			n.insert({after: editor.templateProvider.emptyElement()})
			var temp = n.next()
			editor.selector.selectDirect(temp)
			editor.inlineEditor.edit(temp, { init: "", 
				options: editor.constraintChecker.elementOptions(n.up()), 
				onSuccess: function(v) {
					editor.modelInterface.createElement(n, "after", {_class: v});
					editor.selector.selectDirect(n.next());
					editor.showHiddenFeatures(n.next());
					temp.remove();
					editor.adjustMarker();
				},
				onFailure: function(v) {
					temp.remove()
					editor.selector.selectDirect(n)
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
	
]
