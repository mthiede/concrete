Concrete.UI.SearchReplaceDialog = Class.create(Concrete.UI.AbstractDialog, {

  initialize: function($super, options) {
    var dialogElement = this._createDomElement();
    $super(dialogElement, options);

    this.propertyInput = dialogElement.down(".property_input");
    Element.insert(this.propertyInput, { after: 
      "<div style='position: relative; margin: 1px'><div class='auto_complete_dropdown' style='display: none; width: 100%; max-height: 100px; overflow-y: auto'></div></div>"
    });
    this.propertyOptions = [];
    new Autocompleter.Local(this.propertyInput, this.propertyInput.next().down(), this.propertyOptions, {
      partialSearch: true, fullSearch: true, minChars: 0, partialChars: 0, choices: 100 });

    this.searchInput = dialogElement.down(".search_input");
    this.replaceInput = dialogElement.down(".replace_input");
    this.findButton = dialogElement.down(".find_button");
    this.replaceButton = dialogElement.down(".replace_button");
    this.replaceFindButton = dialogElement.down(".replace_find_button");
    this.replaceAllButton = dialogElement.down(".replace_all_button");
    this.regexpBox = dialogElement.down(".regular_expression_box");
    this.statusOutput = dialogElement.down(".status_output");
    this.lastNodeFound = undefined;
  },

  _createDomElement: function() {
    if ($('ct_search_replace_dialog')) return $('ct_search_replace_dialog');
    Element.insert($$('body').first(), { bottom: 
      "<div id='ct_search_replace_dialog' class='popup_dialog' style='display: none; position: fixed; z-index: 1000'>" +
        "<div class='shadow'></div>" +
        "<div class='dialog_box'>" +
        "<div class='title_bar'>" +
          "Find and replace" +
          "<a class='close_button'></a>" +
        "</div>" +
        "<div class='container'>" +
          "<p class='label'>For property</p>" +
          "<input class='text_input property_input' type='text' spellcheck='false'/>" +
          "<div style='float: right; margin-top: 10px'>Regular Expression: <input class='checkbox_input regular_expression_box' type='checkbox' /></div>" +
          "<p class='label'>Find value</p>" +
          "<input class='text_input search_input' type='text' spellcheck='false'/>" +
          "<p class='label'>Replace with</p>" +
          "<input class='text_input replace_input' type='text' spellcheck='false'/>" +
          "<div style='width: 100%; margin: 5px 0 5px 0' class='status_output' >&nbsp;</div>" +
          "<div style='text-align: center; margin: 10px'>" +
            "<input class='button_input find_button' type='button' value='Find' />" +
            "<input class='button_input replace_button' type='button' value='Replace' />" +
            "<input class='button_input replace_find_button' type='button' value='Replace/Find' />" +
            "<input class='button_input replace_all_button' type='button' value='Replace All' />" +
          "</div>" +
        "</div>" +
        "</div>" +
      "</div>" });
    return $('ct_search_replace_dialog');
  },

  _buttonPressed: function(element) {
    var featureDesc = this.propertyInput.value.strip();
    var className = null;
    var featureName = null;
    if (/^(\w*|\*|\w+#\*|\w+#\w+)$/.match(featureDesc)) {
      if (featureDesc.include("#")) {
        className = featureDesc.split("#")[0];
        featureName = featureDesc.split("#")[1];
      }
      else {
        featureName = featureDesc;
      }
    }
    else {
      this._setStatus("Invalid feature description: specify <feature name>, <class name>#<feature name>, <class name>#*, * or leave empty");
      return;
    }
    var searchPattern = this.searchInput.value;
    if (this.regexpBox.checked) {
      try {
        searchPattern = new RegExp(searchPattern);
      } 
      catch(e) {
        this._setStatus("Invalid regular expression");
        return;
      }
    }
    var replaceText = this.replaceInput.value;

    if (element == this.findButton) {
      this._findCommand(className, featureName, searchPattern);
    }
    else if (element == this.replaceButton) {
      this._replaceCommand(searchPattern, replaceText);
    }
    else if (element == this.replaceFindButton) {
      this._replaceCommand(searchPattern, replaceText);
      this._findCommand(className, featureName, searchPattern);
    }
    else if (element == this.replaceAllButton) {
      this._replaceAllCommand(className, featureName, searchPattern, replaceText);
    }
  },

  _findCommand: function(className, featureName, searchPattern) {
    this._setStatus("Searching...");
    this._defer(function() {
      if (this._selectNextMatch(className, featureName, searchPattern)) {
        this._setStatus("Found next occurance");
      }
      else {
        this._setStatus("Pattern not found");
      }
    });
  },

  _replaceCommand: function(searchPattern, replaceText) {
    if (this.lastNodeFound && this.lastSearchPattern.toString() == searchPattern.toString() && this.editor.selector.selected == this.lastNodeFound) {
      this._setStatus("Replacing...");
      this._defer(function() {
        if (this._replaceMatch(this.lastNodeFound, searchPattern, replaceText)) {
          this._setStatus("Replaced 1 occurance");
        }
        else {
          this._setStatus("Nothing replaced");
        }
      });
    }
    else {
      this._setStatus("Use find before replace");
    }
  },

  _replaceAllCommand: function(className, featureName, searchPattern, replaceText) {
    this._setStatus("Replacing...");
    this._defer(function() {
      var numReplaced = this._replaceAll(className, featureName, searchPattern, replaceText);
      this._setStatus("Replaced "+numReplaced+" occurances");
    });
  },

  // this is a special defer which is necessary, since Prototype's defer doesn't seem to yield
  // the current process in a way that UI redrawing can take place
  _defer: function(func) {
    func = func.bind(this);
    window.setTimeout(function() {
      window.setTimeout(func, 0);
    }, 0);
  },

  _selectNextMatch: function(className, featureName, searchPattern) {
    var startLoc = this._findLocation(this.editor.selector.selected);
    if (!startLoc) return false;
    var nextLoc = this.findNext(startLoc[0], startLoc[1], startLoc[2], className, featureName, searchPattern);
    if (nextLoc) {
      var node = nextLoc[0].features[nextLoc[1]].slot.childElements()[nextLoc[2]];
      this.editor.expandParentElements(node);
      if (node.ancestors().any(function(a) {return !a.visible();})) {
        this.editor.showHiddenFeatures(node.up(".ct_element"));
      }
      this.editor.selector.selectDirect(node);
      this.lastNodeFound = node;
      this.lastSearchPattern = searchPattern;
    }
    return (nextLoc != false); 
  },

  _replaceAll: function(className, featureName, searchPattern, replaceText) {
    var startLoc = this._findLocation(this.editor.selector.selected);
    if (!startLoc) return 0;
    var firstMatch = this.findNext(startLoc[0], startLoc[1], startLoc[2], className, featureName, searchPattern);
    var nextMatch = firstMatch;
    var matches = [];
    while (nextMatch) {
      matches.push(nextMatch);
      nextMatch = this.findNext(nextMatch[0], nextMatch[1], nextMatch[2], className, featureName, searchPattern);
      if (nextMatch[0] == firstMatch[0] && nextMatch[1] == firstMatch[1] && nextMatch[2] == firstMatch[2]) {
        break;
      }
    }
    var numReplaced = 0;
    matches.each(function(match) {
      var node = match[0].features[match[1]].slot.childElements()[match[2]];
      if (this._replaceMatch(node, searchPattern, replaceText)) {
        numReplaced++;
      }
    }, this);
    return numReplaced;
  },

  _replaceMatch: function(node, searchPattern, replaceText) {
    var newValue = null;
    if (Object.isString(searchPattern) && (searchPattern.empty() || searchPattern.strip() == "*")) {
      if (replaceText.empty()) {
        //this.editor.modelInterface.removeValue(node);
      }
      else {
        newValue = replaceText;
      }
    }
    else {
      newValue = node.value.replace(searchPattern, replaceText);
    }
    if (newValue) {
      this.editor.modelInterface.changeValue(node, newValue);
      return true;
    }
    else {
      return false;
    }
  },

  // finds the next value starting from +element+, feature index +fIndex+, value index +vIndex+
  // when the last model element has been checked, the search will continue with the first element
  // the search will stop after the starting point has been reached and checked
  //
  findNext: function(element, fIndex, vIndex, className, featureName, searchPattern) {
    var startElement = element;
    var startFIndex = fIndex;
    var startVIndex = vIndex;
    var containmentStack = [];
    var wrapAround = 0;
    while (true) {
      var feature = element.features[fIndex];
      var values = feature && element.featureValues(feature.mmFeature.name);
      if (feature && (vIndex < values.size()-1)) {
        // next value
        vIndex++;
        if (feature.mmFeature.isContainment()) {
          // go down to child element
          containmentStack.push(element);
          containmentStack.push(feature);
          element = values[vIndex];
          fIndex = 0;
          vIndex = -1; 
        }
        else {
          // found a value
          if ((!className || className == "*" || element.mmClass.name == className) &&
            (!featureName || featureName == "*" || feature.mmFeature.name == featureName) &&
            (!searchPattern ||
              (Object.isString(searchPattern) && (searchPattern == "*" || (""+values[vIndex]).include(searchPattern))) ||
              (!Object.isString(searchPattern) && searchPattern.match(""+values[vIndex])))) {
                return [element, fIndex, vIndex];
          }
        }
      }
      else if (fIndex < element.features.size()-1) {
        // next feature
        fIndex++;
        vIndex = -1;
      }
      else {
        var parentFeature = containmentStack.pop() || element.up(".ct_containment");
        if (parentFeature) {
          // go up to parent
          var parentElement = containmentStack.pop() || parentFeature.up(".ct_element");
          fIndex = parentElement.features.indexOf(parentFeature);
          vIndex = parentFeature.slot.childElements().indexOf(element);
          element = parentElement;
        }
        else if (element.next()) {
          // next on root level
          element = element.next();
          fIndex = 0;
          vIndex = -1;
        }
        else {
          // first on root level, wrap around
          element = element.up(".ct_root").childElements().first();
          fIndex = 0;
          vIndex = -1;
          wrapAround++;
        }
      }
      if ((element == startElement && fIndex == startFIndex && vIndex == startVIndex) || wrapAround > 1) {
        // reached starting point, or wrapped around more than once (safety check to avoid endless loop)
        return false;
      }
    }
  },

  _setStatus: function(text) {
    this.statusOutput.textContent = text;
  },
  
  _findLocation: function(node) {
    if (node.mmClass) {
      return [node, 0, -1];
    }
    else if (node.hasClassName("ct_empty")) {
      var feature = node.findAncestor(["ct_containment", "ct_reference", "ct_attribute"]);
      if (feature) {
        var element = feature.up(".ct_element");
        return [element, element.features.indexOf(feature), -1];
      }
      else {
        // empty element on root level
        return false;
      }
    }
    else {
      var feature = node.findAncestor(["ct_containment", "ct_reference", "ct_attribute"]);
      var element = feature.up(".ct_element");
      return [element, element.features.indexOf(feature), feature.slot.childElements().indexOf(node)];
    }
  },

  open: function($super, editor) {
    $super();
    this.editor = editor;
    this.propertyOptions.clear();
    this.lastNodeFound = undefined;
    this.statusOutput.innerHTML = "&nbsp;";
    var featureNames = [];
    this.options.metamodelProvider.metaclasses.each(function(c) { 
      this.propertyOptions.push(c.name+"#*");
      c.allFeatures().each(function(f) {
        featureNames.push(f.name);
        this.propertyOptions.push(c.name+"#"+f.name);
      }, this);
    }, this);
    featureNames.uniq().reverse().each(function(fn) {
      this.propertyOptions.unshift(fn);
    }, this);
  }

});


