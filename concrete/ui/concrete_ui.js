Concrete.UI = {
  load: function() {
    var js = /concrete_ui\.js(\?.*)?$/;
    $$('head script[src]').findAll(function(s) {
      return s.src.match(js);
    }).each(function(s) {
      var path = s.src.replace(js, '');
      [
				'abstract_dialog',
        'proceed_dialog',
        'open_element_dialog',
        'search_replace_dialog',
        'preferences_dialog',
        'create_module_dialog',
        'layout_manager',
        'toolbar',
        'module_browser',
        'module_editor',
        'workbench'
      ].each( function(include) { 
      	Concrete.require(path + include + '.js');
    	});
		});
	}
};

Concrete.UI.load();

