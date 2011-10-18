Concrete.UI.Workbench = {

  // Toplevel setup of an editor workbench.
  // Creates editor views and connects event and command handlers.
  // 
  // Options:
  //
  // moduleBrowserOptions: options passed to the module browser, default: none
  // moduleEditorOptions: options passed to the module editor, default: none
  //
  setup: function(metamodel, indexMetamodel, options) {
    options = options || {};

    var layoutManager = new Concrete.UI.LayoutManager();

    var toolbar = new Concrete.UI.Toolbar(layoutManager.toolbar);

    var mp = new Concrete.MetamodelProvider(metamodel);

    var index = []; 
    var eip = new Concrete.IndexBasedExternalIdentifierProvider(index, mp);

    var editorOptions = options.moduleEditorOptions || {};
    editorOptions.onFollowReference = function(module, ident) {
      jumpReference(module, ident);
    };
    var moduleEditor = new Concrete.UI.ModuleEditor(layoutManager.main, eip, mp, editorOptions);

    var browserOptions = options.moduleBrowserOptions || {};
    browserOptions.onOpenModule = function(module, ident) {
      jumpReference(module, ident);
    };
    var moduleBrowser = new Concrete.UI.ModuleBrowser(layoutManager.sidebar, indexMetamodel, browserOptions);

    var openElementDialog = new Concrete.UI.OpenElementDialog(eip, {
      onOpenReference: function(module, ident) {
        jumpReference(module, ident);
      }
    });

    var searchReplaceDialog = new Concrete.UI.SearchReplaceDialog({
      metamodelProvider: mp
      });

    var preferencesDialog = new Concrete.UI.PreferencesDialog();

    // Event Handler

    Event.observe(window, 'click', function(event) {
      moduleEditor.handleEvent(event);
      moduleBrowser.handleEvent(event);
    });
    Event.observe(window, 'dblclick', function(event) {
      moduleBrowser.handleEvent(event);
    });
    Event.observe(window, 'keydown', function(event) {
      if (toolbar.handleEvent(event)) {}
      else if ($$(".popup_dialog").any(function(d) {return d.visible();})) {}
      else {
        moduleEditor.handleEvent(event);
        moduleBrowser.handleEvent(event);
      }
    });
    Event.observe(window, 'mousedown', function(event) {
      layoutManager.handleEvent(event);
    });
    Event.observe(window, 'mouseup', function(event) {
      layoutManager.handleEvent(event);
    });
    Event.observe(window, 'mousemove', function(event) {
      toolbar.handleEvent(event);
      if (layoutManager.handleEvent(event)) {}
      else { 
        moduleEditor.handleEvent(event);
        moduleBrowser.handleEvent(event);
      }
    });

    // Commands

    toolbar.addCommand({buttonClass: "ct_create_module_button", tooltip: "Create Module"}, function() {
      moduleEditor.createModule({
        onSuccess: function() {
          loadIndex();
        },
        onFailure: function() {
          alert("Create module failed");
        }
      });
    });

    toolbar.addCommand({buttonClass: "ct_save_button", hotkey: "ctrl+shift+S", tooltip: "Save Module"}, function() {
      moduleEditor.save({
        onSuccess: function() {
          loadIndex();
        },
        onFailure: function() {
          alert("Save failed");
        }
      });
    });

    toolbar.addCommand({buttonClass: "ct_open_element_button", hotkey: "ctrl+shift+E", tooltip: "Open Element"}, function() {
      openElementDialog.open(eip.getAllElementInfo());
    });

    toolbar.addCommand({buttonClass: "ct_search_replace_button", hotkey: "ctrl+shift+F", tooltip: "Search and Replace"}, function() {
      searchReplaceDialog.open(moduleEditor.editor);
    });

    toolbar.addCommand({buttonClass: "ct_toggle_short_references_button", tooltip: "Toggle Short References"}, function() {
      moduleEditor.toggleShortReferences();
    });

    toolbar.addCommand({buttonClass: "ct_stop_server_button", tooltip: "Stop Server"}, function() {
      new Ajax.Request("/exit");
    });

    toolbar.addCommand({buttonClass: "ct_browse_help_button", tooltip: "Browse Help"}, function() {
      window.open("/doc/concrete_users_guide.html", "Concrete Users Guide");
    });

    toolbar.addCommand({buttonClass: "ct_preferences_button", tooltip: "Preferences"}, function() {
      preferencesDialog.open();
    });

    function jumpReference(module, ident) {
      var href = "#"+module+((ident && ":"+ident) || "");
      window.location.href = href; 
    }

    function loadIndex(options) {
      new Ajax.Request("/loadIndex", {
        method: "get",
        onSuccess: function(transport) {
          index.clear();
          var indexJson = transport.responseText.evalJSON(); 
          indexJson.sortBy(function(m) {return m.name;}).each(function(m) {
            index.push(m);
          });
          moduleBrowser.loadIndex(index);
          if (options && options.onIndexLoaded) options.onIndexLoaded();
        }
      });
    }

    window.onresize = function() {
      layoutManager.layout();
    };

    window.onhashchange = function() {
      var match = window.location.href.match(/#([^:]+):?(.*)/);
      var module = match && match[1];
      var ident = match && match[2];
      moduleEditor.select(module, ident);
    };

    // first update after loading
    window.onresize();
    loadIndex({onIndexLoaded: function() {
      window.onhashchange();
    }});
  }
};

