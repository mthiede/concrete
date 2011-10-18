// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Scroller = {};

// scrolls the window or the first scrollable container by the smallest possible offset
// which meximizes the visible part of element e 
// +direction+ can be on of "horizontal", "vertical" or "both"
Concrete.Scroller.scrollTo = function(e, direction) {
  if (!["horizontal", "vertical", "both"].include(direction)) throw "invalid direction";

  var isScrollable = function(f) {
    return (f.getDimensions().width > f.up().getDimensions().width ||
    f.getDimensions().height > f.up().getDimensions().height);
  };

  var findScrollable = function(f) {
    if (f.tagName.toUpperCase() == "BODY") return undefined;
    if (isScrollable(f)) {
      return f;
    } 
    else {
      return findScrollable(f.up());
    }
  };

  var maxScroll = function(negOffset, posOffset) {
    if ((negOffset*-1) < posOffset) {
      return negOffset*-1;
    }
    else {
      return posOffset;
    }
  };

  var scrollable = findScrollable(e);

  if (scrollable) {
    var scrollContainer = scrollable.up();
    var coff = scrollContainer.cumulativeOffset();
    var cdim = scrollContainer.getDimensions();
    var eoff = e.cumulativeOffset();
    var edim = e.getDimensions();

    var leftBorderDist = eoff.left - coff.left - scrollContainer.scrollLeft;
    var rightBorderDist = coff.left + cdim.width - (eoff.left + edim.width) + scrollContainer.scrollLeft;
    var topBorderDist = eoff.top - coff.top - scrollContainer.scrollTop;
    var bottomBorderDist = coff.top + cdim.height - (eoff.top + edim.height) + scrollContainer.scrollTop;

    if (direction == "horizontal" || direction == "both") {
      if (leftBorderDist < 0 && rightBorderDist > 0) {
        scrollContainer.scrollLeft = scrollContainer.scrollLeft - maxScroll(leftBorderDist, rightBorderDist);
      }
      else if (rightBorderDist < 0 && leftBorderDist > 0) {
        scrollContainer.scrollLeft = scrollContainer.scrollLeft + maxScroll(rightBorderDist, leftBorderDist);
      }
    }

    if (direction == "vertical" || direction == "both") {
      if (topBorderDist < 0 && bottomBorderDist > 0) {
        scrollContainer.scrollTop = scrollContainer.scrollTop - maxScroll(topBorderDist, bottomBorderDist);
      }
      else if (bottomBorderDist < 0 && topBorderDist > 0) {
        scrollContainer.scrollTop = scrollContainer.scrollTop + maxScroll(bottomBorderDist, topBorderDist); 
      }
    }

  }
  else {
    var vpLeft = document.viewport.getScrollOffsets().left;
    var vpRight = document.viewport.getScrollOffsets().left + window.innerWidth;
    var vpTop = document.viewport.getScrollOffsets().top;
    var vpBottom = document.viewport.getScrollOffsets().top + window.innerHeight;
    
    var leftBorderDist = e.left()-vpLeft;
    var rightBorderDist = vpRight-e.right();
    var topBorderDist = e.top()-vpTop;
    var bottomBorderDist = vpBottom-e.bottom();
    
    var scrollPosX = vpLeft;
    var scrollPosY = vpTop;
    
    if (direction == "horizontal" || direction == "both") {
      if (leftBorderDist < 0 && rightBorderDist > 0) {
        scrollPosX = vpLeft - maxScroll(leftBorderDist, rightBorderDist);
      }
      else if (rightBorderDist < 0 && leftBorderDist > 0) {
        scrollPosX = vpLeft + maxScroll(rightBorderDist, leftBorderDist);
      }
    }

    if (direction == "vertical" || direction == "both") {
      if (topBorderDist < 0 && bottomBorderDist > 0) {
        scrollPosY = vpTop - maxScroll(topBorderDist, bottomBorderDist);
      }
      else if (bottomBorderDist < 0 && topBorderDist > 0) {
        scrollPosY = vpTop + maxScroll(bottomBorderDist, topBorderDist);
      }
    }

    window.scrollTo(scrollPosX, scrollPosY);
  }
};
