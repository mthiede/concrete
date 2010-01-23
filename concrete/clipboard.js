// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.Clipboard = Class.create({

	// if a storageElement is specified, the data is stored as textContent of this element	
	initialize: function(storageElement) {
		this.element = storageElement;
		this.kind = undefined;
	},
	
	read: function() {
		var data = this._readRaw();
		if (data && Object.isString(data) && data.isJSON()) {
			return data.evalJSON();
		}
		else {
			return data;
		}
	},
	
	write: function(data) {
		if (data instanceof Object) {
			this._writeRaw(Concrete.Helper.prettyPrintJSON(Object.toJSON(data)));
		}
		else {
			this._writeRaw(data);
		}
	},
	
	containsElement: function() {
		var data = this._readRaw();
		return data && Object.isString(data) && data.isJSON();
	},
	
	containsValue: function() {
		var data = this._readRaw();
		return data && Object.isString(data) && !data.isJSON();
	},
	
	_readRaw: function() {
		if (this.element) {
			if (this.element.tagName == "TEXTAREA") {
				return this.element.value;
			}
			else {
				return this.element.innerHTML;	
			}
		}
		else {
			return this.data;		
		}		
	},

	_writeRaw: function(data) {
		if (this.element) {
			if (this.element.tagName == "TEXTAREA") {
				this.element.value = data;
			}
			else {
				this.element.innerHTML = data;
			}
		}
		else {
			this.data = data;
		}		
	}
		
});
