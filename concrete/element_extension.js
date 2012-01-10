// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Element.addMethods({
  left: function(e) {
    return e.cumulativeOffset().left;
  },
  right: function(e) {
    return e.cumulativeOffset().left + Element.getWidth(e);
  },
  top: function(e) {
    return e.cumulativeOffset().top;
  },
  bottom: function(e) {
    return e.cumulativeOffset().top + Element.getHeight(e);
  },
  matchesClasses: function(e, classes) {
    for (var i=0; i<classes.length; i++) {
      if (e.hasClassName(classes[i])) return true;
    }
    return false;
  },
  variantInfo: function(e) {
    var result = null;
    var match;
    e.classNames()._each(function(n) {
      match = n.match(/^ct_var(\d+)_(\d+)$/);
      if (match) {
        max = parseInt(match[1], 10);
        cur = parseInt(match[2], 10);
        result = { current: cur, max: max };
      }
    });
    return result;
  },
  setVariantIndex: function(e, index) {
    var vi = e.variantInfo();
    if (vi) {
      e.removeClassName("ct_var"+vi.max+"_"+vi.current);
      e.addClassName("ct_var"+vi.max+"_"+index);
    }
  },
  /**
   * This method is necessary because Prototype's up() doesn't support
   * searching for multiple classes. Optionally, a single class may be
   * specified - in this case this offers a speed improvement over up().
   */
  findAncestor: function(e, classes) {
    var parent = e.parentNode;
    if (classes instanceof Array) {
      while (!parent.matchesClasses(classes)) {
        parent = parent.parentNode;
        if (!parent || parent.nodeType != 1) return;
      }
    }
    else {
      while (!parent.hasClassName(classes)) {
        parent = parent.parentNode;
        if (!parent || parent.nodeType != 1) return;
      }
    }
    return parent;
  },
  findAncestorOrSelf: function(e, classes) {
    if ( e.matchesClasses(classes) )
      return e;
    else
      return e.findAncestor(classes);
  },
  /**
   * Collects the first elements on each descendant path which match the searchClasses.
   * Stops searching a path when it hits an element matching the stopClasses.
   */
  findFirstDescendants: function(e, searchClasses, stopClasses) {
    return e.childElements().collect(function(c) {
      if (c.matchesClasses(searchClasses)) {
        return c;
      }
      else if (c.matchesClasses(stopClasses)) {
        return [];
      }
      else {
        return c.findFirstDescendants(searchClasses, stopClasses);
      }
    }, this).flatten();
  },
  allChildren: function(e) {
    return $A(e.getElementsByTagName("*"));
  }
});
