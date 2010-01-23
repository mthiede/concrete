// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Scroller = {};

Concrete.Scroller.scrollTo = function(e) {
	var vpLeft = document.viewport.getScrollOffsets().left;
	var vpRight = document.viewport.getScrollOffsets().left + window.innerWidth;
	var vpTop = document.viewport.getScrollOffsets().top;
	var vpBottom = document.viewport.getScrollOffsets().top + window.innerHeight;
	
	var leftBorderDist = e.left()-vpLeft;
	var rightBorderDist = vpRight-e.right();
	var topBorderDist = e.top()-vpTop;
	var bottomBorderDist = vpBottom-e.bottom();
	
	var maxScroll = function(negOffset, posOffset) {
		if ((negOffset*-1) < posOffset) {
			return negOffset*-1;
		}
		else {
			return posOffset;
		}
	}
	
	var scrollPosX;
	var scrollPosY;
	
	if (leftBorderDist < 0 && rightBorderDist > 0) {
		scrollPosX = vpLeft - maxScroll(leftBorderDist, rightBorderDist);
	}
	else if (rightBorderDist < 0 && leftBorderDist > 0) {
		scrollPosX = vpLeft + maxScroll(rightBorderDist, leftBorderDist);
	}
	else {
		scrollPosX = vpLeft;
	}

	if (topBorderDist < 0 && bottomBorderDist > 0) {
		scrollPosY = vpTop - maxScroll(topBorderDist, bottomBorderDist);
	}
	else if (bottomBorderDist < 0 && topBorderDist > 0) {
		scrollPosY = vpTop + maxScroll(bottomBorderDist, topBorderDist);
	}
	else {
		scrollPosY = vpTop;
	}
	window.scrollTo(scrollPosX, scrollPosY);
}
