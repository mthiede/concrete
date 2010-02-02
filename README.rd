= Concrete Model Editor 

Concrete is a lightweight, web-based model editor which can be configured for different DSLs (Domain Specific Languages). 

The basic idea is to make use of the browser's document object model (DOM) to represent models and it's rendering engine to create the graphical represenation. DSLs are defined by metamodels (abstract syntax) and DOM templates combined with CSS (concrete syntax). 

Concrete is a Javascript widget based on Prototype and Scriptaculous. It exchanges model data in JSON format and can be integrated easily using Ajax.

Note that until now, Concrete has only been tested sucessfully with Firefox.


== Screencast

See Concrete in action by watching the screencast[http://vimeo.com/9164866].


== Download

You can get the latest version from github.


== Installation

Concrete is not a standalone editor but needs to be integrated into a (web) application. For more information how to do this, see the developers guide and the examples included.


== Documentation

There is a Users Guide and a Developers Guide in the doc folder. The Users Guide explains the usage of the editor independant of any specific DSL. The Developers Guide describes how to create own DSLs and how to integrate Concrete.


== Examples

Currently, the examples folder contains: 
* A metamodel editor which can be used to create and edit Concrete metamodels
* A simple formula editor which shows some more math like graphical representation
* A simple statechart editor, featuring graphical representation of states

To use the examples, just open the HTML file in your browser (currently it should be Firefox). You can start from scratch or load a given model in JSON format. To do so just paste it into the clipboard box visible on each example page, then focus the editor and paste again using Ctrl-V. To store an example model, select it in the editor using Ctrl-A, copy it to the internal clipboard using Ctrl-C and then copy the JSON from the clipboard area to where you need it.
	
In the metamodel example, there is also a little Ruby program which shows server interaction with Ajax. You can run the edit.rb with a JSON file as argument and it will fire up the browser, load the model, let you edit it and write it back to the file when you click the "Save" button. There is a folder "example_data" which contains the plain metamodels of the examples, they are basically the same as what is embedded in the respective example HTML files.

To edit the statemachine example metamodel, you would do:

  example/metamodel_editor> ruby edit.rb example_data/statemachine_metamodel.json

If you want to try the respective editor with the changed metamodel, you have to put it into the HTML file. It will not load the metamodel from the "example_data" folder.


== License

Concrete is licensed under the terms of the MIT license, see the included MIT-LICENSE file.

