// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
// 
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var Concrete = {
  Version: '0.1.0',
  require: function(r) {
    document.write('<script type="text/javascript" src="'+r+'"><\/script>');
  },
  load: function() {
    // TODO: check prototype and scriptaculous version
    var js = /concrete\.js(\?.*)?$/;
    $$('head script[src]').findAll(function(s) {
      return s.src.match(js);
    }).each(function(s) {
      var path = s.src.replace(js, '');
      [
        'editor',
        'selector',
        'scroller',
        'element_extension',
        'basic_inline_editor',
        'inline_editor',
        'template_provider',
        'model_interface',
        'metamodel_provider',
        'identifier_provider',
        'external_identifier_provider',
        'constraint_checker',
        'clipboard',
        'helper'
      ].each( function(include) { 
        Concrete.require(path + include + '.js');
      });
    });
  }
};

Concrete.load();
