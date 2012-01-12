ExampleData = Object.toJSON( 
[{"_class": "Statemachine", "name": "AC", "triggers": [
  {"_class": "Trigger", "_view": 
    {"collapsed": false}, "name": "OnButton"}, 
  {"_class": "Trigger", "_view": 
    {"collapsed": false}, "name": "ModeButton"}], "_view": 
  {"container-size": 
    {"chartElements": 
      {"width": "1553px", "height": "211px"}}}, "chartElements": [
  {"_class": "SimpleState", "_view": 
    {"collapsed": false, "position": 
      {"left": "15px", "top": "46px"}}, "name": "Off"}, 
  {"_class": "CompositeState", "_view": 
    {"collapsed": false, "position": 
      {"left": "397px", "top": "-30px"}, "container-size": 
      {"chartElements": 
        {"width": "596px", "height": "144px"}}}, "name": "On", "chartElements": [
    {"_class": "SimpleState", "_view": 
      {"collapsed": false, "position": 
        {"left": "45px", "top": "54px"}}, "name": "Heating"}, 
    {"_class": "SimpleState", "_view": 
      {"collapsed": false, "position": 
        {"left": "442px", "top": "66px"}}, "name": "Cooling"}, 
    {"_class": "Transition", "_view": 
      {"position": 
        {"left": "236px", "top": "4px"}, "variant": 2}, "sourceState": "/AC/On/Heating", "targetState": "/AC/On/Cooling", "trigger": "/AC/ModeButton"}, 
    {"_class": "Transition", "_view": 
      {"position": 
        {"left": "235px", "top": "82px"}, "variant": 1}, "sourceState": "/AC/On/Cooling", "targetState": "/AC/On/Heating", "trigger": "/AC/ModeButton"}]}, 
  {"_class": "Transition", "_view": 
    {"position": 
      {"left": "214px", "top": "93px"}, "variant": 1}, "sourceState": "/AC/Off", "targetState": "/AC/On", "trigger": "/AC/OnButton"}, 
  {"_class": "Transition", "_view": 
    {"position": 
      {"left": "212px", "top": "-19px"}, "variant": 2}, "sourceState": "/AC/On", "targetState": "/AC/Off", "trigger": "/AC/OnButton"}]}]
);
