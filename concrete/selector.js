// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Selector = Class.create({

  // Options:
  //   cursorEdgeOnly: if set to true snap cursor to element edges, default: true
  //
  initialize: function(options) {
    options = options || {};
    this.cursor = {x: 0, y: 0};
    this._inlineFirst = true;
    this._cursorEdgeOnly = options.cursorEdgeOnly == undefined ? true : options.cursorEdgeOnly;
    this.selected = undefined;
    this.multiSelected = [];
  },

  setOnChangeFunction: function(f) {
    this.changeActionFunc = f;
  },

  selectDirect: function(s, multi) {
    var selectable = this.surroundingSelectable(s);
    if (selectable) {
      var last = this.selected;
      this._setSelected(selectable, multi);
      this.changeActionFunc && this.changeActionFunc(last, selectable);
    }
  },

  surroundingSelectable: function(s) {
    return s.findAncestorOrSelf(Concrete.Selector.SelectableClasses);
  },

  selectTab: function(dir) {
    var inner = this._findTabSelectables(this.selected);
    if (inner.size() > 0) {
      this.selectDirect(inner.first());
    }
    else {
      var parent = this.selected.findAncestor(Concrete.Selector.SelectableClasses);
      var sameLevel = parent ? this._findTabSelectables(parent) : [];
      var idx = sameLevel.indexOf(this.selected);
      if (idx >= 0) {
        if (dir == "next") idx++;
        if (dir == "prev") idx--;
        if (idx >= sameLevel.size()) idx = 0;
        if (idx < 0) idx = sameLevel.size()-1;
        this.selectDirect(sameLevel[idx]);
      }
    }
  },

  selectCursor: function(dir, multi) {
    // multi select only works on elements
    if (multi && !this.selected.hasClassName("ct_element")) this._setSelected(this.selected.up(".ct_element"));

    var inner = this._findCursorSelectables(this.selected);
    var parent = this.selected.findAncestor(Concrete.Selector.SelectableClasses); 
    var outer = this._findCursorSelectables(parent ? parent : this.selected.up()).without(this.selected);

    var candidates = [];
    var inline = [];
    if (!multi && this._shouldGoInside(dir) && inner.size() > 0) {
      if (this._inlineFirst) {
        inline = inner.select(function(s){ return this._isCursorInline(dir, s); }, this);
      }
      candidates = (inline.size() > 0 ? inline : inner);
    }
    else if (outer.size() > 0) {
      if (this._inlineFirst) {
        inline = outer.select(function(s){ return this._isSelectedElementInline(dir, s); }, this).select(function(s){ return this._isOuterInDirection(dir, s); }, this);
      }
      candidates = (inline.size() > 0 ? inline : outer.select(function(s){ return this._isOuterInDirection(dir, s); }, this));
    }

    function sortNextInDirection(dir, s) {
      if (dir == "left") {
        return -s.right();
      }
      else if (dir == "right") {
        return s.left();
      }
      else if (dir == "up") {
        return -s.bottom();
      }
      else if (dir == "down") {
        return s.top();
      }
    }

    var next = undefined;
    if (candidates.size() > 0) {
      next = candidates.sortBy(function(s) { return sortNextInDirection(dir, s); }, this).first();
      var last = this.selected;
      this._setSelected(next, multi);
      this._adjustCursorNext(dir, next);
      this.changeActionFunc && this.changeActionFunc(last, this.selected);
    }
    else if (parent) {
      next = parent;
      var last = this.selected;
      this._setSelected(next, multi);
      this._adjustCursorParent(dir, next);
      this.changeActionFunc && this.changeActionFunc(last, this.selected);
    }
  },

  getCursorPosition: function() {
    if (this.cursor.element) {
      return {
        x: this.cursor.element.left()+this.cursor.x*Element.getWidth(this.cursor.element),
        y: this.cursor.element.top()+this.cursor.y*Element.getHeight(this.cursor.element),
        xratio: this.cursor.x,
        yratio: this.cursor.y };
    }
    else {
      return {x: 0, y: 0, xratio: 0, yratio: 0};
    }
  },

  // private
  
  _findTabSelectables: function(root) {
    return this._reallyVisibles(
        root.findFirstDescendants(Concrete.Selector.TabSelectableClasses, Concrete.Selector.SelectableClasses)
      );
  },

  _findCursorSelectables: function(root) {
    return this._reallyVisibles(
        root.findFirstDescendants(Concrete.Selector.CursorSelectableClasses, [])
      );
  },

  _reallyVisibles: function(elements) {
    return elements.select(function(n) {
          return n.visible() && n.ancestors().all(function(a){ return a.visible(); });
        }
      );
  },

  /**
   * Returns true if s is inline with the cursor in the given direction.
   */
  _isCursorInline: function(dir, s) {
    var cursor = this.getCursorPosition();
    if (dir == "left" || dir == "right") {
      return (s.top() <= cursor.y && s.bottom() >= cursor.y);
    }  
    else if (dir == "up" || dir == "down") {
      return (s.left() <= cursor.x && s.right() >= cursor.x);
    }  
    return false;
  },

  /**
   * Returns true if s is inline (i.e. overlaps) with the currently selected
   * element in the given direction.
   */
  _isSelectedElementInline: function(dir, s) {
    if (dir == "left" || dir == "right") {
      return (s.top() <= this.selected.bottom() && s.bottom() >= this.selected.top());
    }
    else if (dir == "up" || dir == "down") {
      return (s.left() <= this.selected.right() && s.right() >= this.selected.left());
    }
    return false;
  },

  /**
   * Returns true if s is outside of the current element in direction dir.
   */
  _isOuterInDirection: function(dir, s) {
    if (dir == "left") {
      return s.right() <= this.selected.left();
    }
    else if (dir == "right") {
      return s.left() >= this.selected.right();
    }
    else if (dir == "up") {
      return s.bottom() <= this.selected.top();
    }
    else if (dir == "down") {
      return s.top() >= this.selected.bottom();
    }
  },

  /**
   * Determine if next selectable should be looked for inside of the current element.
   */
  _shouldGoInside: function(dir) {
    var cursor = this.getCursorPosition();
    if (dir == "left") {
      return cursor.x == this.selected.right();
    }
    else if (dir == "right") {
      return cursor.x == this.selected.left();
    } 
    else if (dir == "up") {
      return cursor.y == this.selected.bottom();
    }
    else if (dir == "down") {
      return cursor.y == this.selected.top();
    }
  },

  /**
   * Adjust the cursor when the next selected is next to the current element
   * this should be used after _setSelected() to override the default
   * adjustment.
   */
  _adjustCursorNext: function(dir, s) {
    if (dir == "left") {
      this.cursor.x = 1;
    }
    else if (dir == "right") {
      this.cursor.x = 0;
    }
    else if (dir == "up") {
      this.cursor.y = 1;
    }
    else if (dir == "down") {
      this.cursor.y = 0;
    }
  },
  
  /**
   * Adjust the cursor when the next selected is a parent of the current
   * element this should be used after _setSelected() to override the default
   * adjustment.
   */
  _adjustCursorParent: function(dir, s) {
    if (dir == "left") {
      this.cursor.x = 0;
    }
    else if (dir == "right") {
      this.cursor.x = 1;
    }
    else if (dir == "up") {
      this.cursor.y = 0;
    }
    else if (dir == "down") {
      this.cursor.y = 1;
    }
  },

  /**
   * Set the currently selected element to s and adjusts the cursor to be on
   * the boundaries of s.
   */
  _setSelected: function(s, multi) {
    if (s == this.selected) return;
    this.multiSelected.each(function(e) { e.removeClassName("ct_selected"); });
    if (this.selected) this.selected.removeClassName("ct_selected");
    this.multiSelected = [];
    if (multi && this.selected) {
      this.multiSelectStart = this.multiSelectStart || this.selected;
      var last = this.multiSelectStart;
      last = last.hasClassName("ct_element") ? last : last.up(".ct_element");
      s = s.hasClassName("ct_element") ? s : s.up(".ct_element");
      var lastAncestors = [last].concat(last.ancestors());
      var newAncestors = [s].concat(s.ancestors());
      if (s == last) {
        this.selected = s;
      }
      else if (lastAncestors.include(s)) {
        this.selected = s;
      }
      else if (newAncestors.include(last)) {
        this.selected = last;
      }
      else {
        while (lastAncestors.last() == newAncestors.last()) { 
          lastAncestors.pop();
          newAncestors.pop();
        }
        last = lastAncestors.last();
        s = newAncestors.last();
        this.selected = s;
        var siblings = s.up().childElements();
        var lastIndex = siblings.indexOf(last);
        var newIndex = siblings.indexOf(s);
        this.multiSelected = (newIndex > lastIndex) ? siblings.slice(lastIndex, newIndex+1) : siblings.slice(newIndex, lastIndex+1);
      }
    }
    else {
      this.selected = s;
      this.multiSelectStart = undefined;
    }
    this.multiSelected.each(function(e) { e.addClassName("ct_selected"); });
    this.selected.addClassName("ct_selected");
    this._adjustCursor(this.selected);
  },

  _adjustCursor: function(s) {
    var cur = this.getCursorPosition();
    this.cursor.element = s;
    if (this._cursorEdgeOnly) {
      this.cursor.x = (cur.x < (s.left()+s.right())/2) ? 0 : 1;
      this.cursor.y = (cur.y < (s.top()+s.bottom())/2) ? 0 : 1;
    }
    else {
      var x = cur.x;
      var y = cur.y;
      if (x < s.left()) x = s.left();
      if (x > s.right()) x = s.right();
      if (y < s.top()) y = s.top();
      if (y > s.bottom()) y = s.bottom();
      this.cursor.x = (x - s.left()) / Element.getWidth(s);
      this.cursor.y = (y - s.top()) / Element.getHeight(s);
    }
  }

});

Concrete.Selector.TabSelectableClasses = ['ct_value', 'ct_element'];
Concrete.Selector.CursorSelectableClasses = ['ct_value', 'ct_element'];
Concrete.Selector.SelectableClasses = ['ct_value', 'ct_element'];
