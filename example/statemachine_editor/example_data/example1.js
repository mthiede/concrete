ExampleData = Object.toJSON( 
[{"_class": "Statemachine", "name": "AC", "triggers": [
  {"_class": "Trigger", "name": "OnButton"}, 
  {"_class": "Trigger", "name": "ModeButton"}], "states": [
  {"_class": "SimpleState", "name": "Off", "transitions": 
    {"_class": "Transition", "targetState": "/AC/On", "trigger": "/AC/OnButton"}}, 
  {"_class": "CompositeState", "name": "On", "subStates": [
    {"_class": "SimpleState", "name": "Heating", "transitions": 
      {"_class": "Transition", "targetState": "/AC/On/Cooling", "trigger": "/AC/ModeButton"}}, 
    {"_class": "SimpleState", "name": "Cooling", "transitions": 
      {"_class": "Transition", "targetState": "/AC/On/Heating", "trigger": "/AC/ModeButton"}}], "transitions": 
    {"_class": "Transition", "targetState": "/AC/Off", "trigger": "/AC/OnButton"}}]}]
);
