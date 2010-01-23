// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.BasicInlineEditor = Class.create({
	
	show: function(element, initialText, partial, completionOptions) {
		if (this.element) {
			// edit still in progress, cancel
			this.hide();
		}
		this.element = element;
		Element.insert(element, { after: 
			"<div class='ct_inline_editor' style='display: inline'>" +
				"<input type='text' size='"+initialText.length+"' value='"+initialText+"'/>" +
				"<div style='display: none; position: absolute;	border: 1px solid grey; background-color: white;'></div>" + 
			"</div>"
		});
		element.hide();
		input = element.next().down();
		this.input = input
		input.select();
		Event.observe(input, 'keypress', function(event) {
			// delay to make sure the keypress already affected the input value
			window.setTimeout(function() { 
				// set size one larger than the text, otherwise the first char is shifted out left when new chars are added at the right
				input.size = input.value.length + 1;
			}, 50);
		});
		new Autocompleter.Local(input, input.next(), completionOptions, {partialSearch: partial, fullSearch: partial, minChars: 0, partialChars: 0 })
	},
	
	getText: function() {
		return this.input.value;
	},
	
	setError: function() {
		this.element.next().addClassName("ct_error");		
	},
	
	hide: function() {
		this.element.show();
		this.element.next().remove();
		this.element = undefined;
	}
	
})
