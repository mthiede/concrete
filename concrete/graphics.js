// Concrete Model Editor
//
// Copyright (c) 2012 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Graphics = {
  getConnectorForCanvas: function(canvas) {
    return canvas._concrete_connector;
  },
  // target element is optional
  createConnector: function(canvasContainer, sourceElement, targetElement) {
    var centerPoint = function(e) {
      return {
        x: e.left() + e.getWidth()/2,
        y: e.top() + e.getHeight()/2
      };
    };
    var lineLength = function(p1, p2) {
      return Math.sqrt(Math.pow(Math.abs(p1.x - p2.x)) + Math.pow(Math.abs(p1.y - p2.y)));
    };
    var isOnLine = function(point, linePoint1, linePoint2) {
      if (((point.x >= linePoint1.x && point.x <= linePoint2.x) ||
           (point.x <= linePoint1.x && point.x >= linePoint2.x)) &&
          ((point.y >= linePoint1.y && point.y <= linePoint2.y) ||
           (point.y <= linePoint1.y && point.y >= linePoint2.y)) &&
          Math.abs(Math.abs(point.y - linePoint1.y) - 
           (Math.abs(point.x - linePoint1.x)*Math.abs(linePoint1.y - linePoint2.y)/Math.abs(linePoint1.x - linePoint2.x))) <= 3) {
        return true;
      }
      else {
        return false;
      }
    };
    var elementBoxClipPoint: function(element, innerPoint, outerPoint) {
      var clipHX, clipHY;
      var clipVX, clipVY;
      var clipPointH, clipPointV;
      if (outerPoint.x < innerPoint.x) {
        clipHX = element.left();
      }
      else {
        clipHX = element.right();
      }
      if (Math.abs(clipHX - innerPoint.x) < Math.abs(innerPoint.x - outerPoint.x)) {
        clipHY = outerPoint.y + ((innerPoint.y - outerPoint.y) * Math.abs(clipHX - outerPoint.x) / Math.abs(innerPoint.x - outerPoint.x));
        clipPointH = {x: clipHX, y: clipHY};
      }
      if (outerPoint.y < innerPoint.y) {
        clipVY = element.top();
      }
      else {
        clipVY = element.bottom();
      }
      if (Math.abs(clipVY - innerPoint.y) < Math.abs(innerPoint.y - outerPoint.y)) {
        clipVX = outerPoint.x + ((innerPoint.x - outerPoint.x) * Math.abs(clipVY - outerPoint.y) / Math.abs(innerPoint.y - outerPoint.y));
        clipPointV = {x: clipVX, y: clipVY};
      }
      if (clipPointH && clipPointV) {
        if (lineLength(outerPoint, clipPointH) > lineLength(outerPoint, clipPointV)) {
          return clipPointH;
        }
        else {
          return clipPointV;
        }
      }
      else {
        return clipPointH || clipPointV; 
      }
    };
    // updates the canvas to contain an arrow from p1 to p2
    // the canvas will be just big enough to fit the arrow
    var drawArrow: function(p1, p2) {
      var ctx = canvas.getContext("2d");  
      var offsetX = (p1.x < p2.x ? p1.x : p2.x) - 20;
      var offsetY = (p1.y < p2.y ? p1.y : p2.y) - 20;
      canvas.width = Math.abs(p1.x - p2.x) + 40;
      canvas.height = Math.abs(p1.y - p2.y) + 40;
      canvas.style.left = offsetX;
      canvas.style.top = offsetY;
      ctx.clearRect(0, 0, canvas.width-1, canvas.height-1);
      ctx.translate(-offsetX, -offsetY);
      ctx.beginPath();  
      ctx.moveTo(p1.x, p1.y);  
      ctx.lineTo(p2.x, p2.y);
      ctx.translate(p2.x, p2.y);
      ctx.rotate(Math.atan2((p2.y-p1.y), p2.x-p1.x));
      ctx.moveTo(-10, -7);
      ctx.lineTo(0, 0);
      ctx.lineTo(-10, 7);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();  
      if (isSelected) {
        ctx.lineWidth = 1;
        ctx.drawRect(-3, -3, 3, 3);
      }
      canvas.show();
    };
    var startPoint = function() {
      return elementBoxClipPoint(sourceElement, centerPoint(sourceElement), centerPoint(targetElement));
    };
    var endPoint = function() {
      return elementBoxClipPoint(targetElement, centerPoint(targetElement), centerPoint(sourceElement))
    };

    var canvas;
    var isSelected = false;

    var connector = {
      draw: function(targetPoint) {
        if (targetPoint) {
          drawArrow(startPoint(), targetPoint);
        }
        else if (targetElement) {
          drawArrow(startPoint(), endPoint());
        }
      },
      isOnConnector: function(point) {
        return isOnLine(point, startPoint(), endPoint());
      },
      isOnDragHandle: function(point) {
        var p = endPoint();
        return Math.abs(p.x - point.x) <= 5 && Math.abs(p.y - point.y) <= 5;
      },
      setSelected: function(sel) {
        isSelected = sel;
      },
      setTargetElement: function(target) {
        targetElement = target;
      },
      destroy: function() {
        canvas.parentNode.removeChild(canvas);
      }
    };

    if (!sourceElement) {
      throw("no source element");
    }
    canvas = document.createElement("canvas");
    canvas.style.position = "absolute;
    canvas.style.display = "none";
    canvasContainer.appendChild(canvas);
    canvas._concrete_connector = connector;

    return connector;
  }
};

