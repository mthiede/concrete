ExampleData = Object.toJSON( 
[{"_class": "Statemachine", "name": "AC", "triggers": [
  {"_class": "Trigger", "_view": 
    {"collapsed": false}, "name": "OnButton"}, 
  {"_class": "Trigger", "_view": 
    {"collapsed": false}, "name": "ModeButton"}], "_view": 
  {"container-size": 
    {"states": 
      {"width": "1553px", "height": "211px"}}}, "states": [
  {"_class": "SimpleState", "_view": 
    {"collapsed": false, "position": 
      {"left": "", "top": ""}}, "name": "Off", "transitions": 
    {"_class": "Transition", "_view": 
      {"collapsed": false}, "targetState": "/AC/On", "trigger": "/AC/OnButton"}}, 
  {"_class": "CompositeState", "_view": 
    {"collapsed": false, "position": 
      {"left": "377px", "top": "-51px"}, "container-size": 
      {"subStates": 
        {"width": "704px", "height": "158px"}}}, "name": "On", "subStates": [
    {"_class": "SimpleState", "_view": 
      {"collapsed": false, "position": 
        {"left": "12px", "top": "93px"}}, "name": "Heating", "transitions": 
      {"_class": "Transition", "_view": 
        {"collapsed": false}, "targetState": "/AC/On/Cooling", "trigger": "/AC/ModeButton"}}, 
    {"_class": "SimpleState", "_view": 
      {"collapsed": false, "position": 
        {"left": "315px", "top": "10px"}}, "name": "Cooling", "transitions": 
      {"_class": "Transition", "_view": 
        {"collapsed": false}, "targetState": "/AC/On/Heating", "trigger": "/AC/ModeButton"}}], "transitions": 
    {"_class": "Transition", "_view": 
      {"collapsed": false}, "targetState": "/AC/Off", "trigger": "/AC/OnButton"}}]}]
);
