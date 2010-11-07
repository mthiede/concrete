ExampleData = Object.toJSON( 
[{"_class": "Datatype", "name": "String"}, 
{"_class": "Class", "name": "Statemachine", "features": [
  {"_class": "Feature", "name": "name", "kind": "attribute", "lowerLimit": 1, "upperLimit": 1, "type": "String"}, 
  {"_class": "Feature", "name": "variables", "kind": "containment", "type": "Variable"}, 
  {"_class": "Feature", "name": "triggers", "kind": "containment", "type": "Trigger"}, 
  {"_class": "Feature", "name": "states", "kind": "containment", "type": "State"}]}, 
{"_class": "Class", "name": "Variable", "features": 
  {"_class": "Feature", "name": "name", "kind": "attribute", "lowerLimit": 1, "upperLimit": 1, "type": "String"}}, 
{"_class": "Class", "name": "Trigger", "features": 
  {"_class": "Feature", "name": "name", "kind": "attribute", "lowerLimit": 1, "upperLimit": 1, "type": "String"}}, 
{"_class": "Class", "name": "State", "abstract": true, "features": [
  {"_class": "Feature", "name": "name", "kind": "attribute", "lowerLimit": 1, "upperLimit": 1, "type": "String"}, 
  {"_class": "Feature", "name": "transitions", "kind": "containment", "upperLimit": -1, "type": "Transition"}]}, 
{"_class": "Class", "name": "SimpleState", "superTypes": "State"}, 
{"_class": "Class", "name": "CompositeState", "superTypes": "State", "features": 
  {"_class": "Feature", "name": "subStates", "kind": "containment", "upperLimit": -1, "type": "State"}}, 
{"_class": "Class", "name": "Transition", "features": [
  {"_class": "Feature", "name": "target", "kind": "reference", "lowerLimit": 1, "upperLimit": 1, "type": "State"}, 
  {"_class": "Feature", "name": "trigger", "kind": "reference", "upperLimit": -1, "type": "Trigger"}, 
  {"_class": "Feature", "name": "condition", "kind": "containment", "upperLimit": 1, "type": "Expression"}]}, 
{"_class": "Class", "name": "Expression"}, 
{"_class": "Class", "name": "AndExpression", "superTypes": "Expression", "features": [
  {"_class": "Feature", "name": "expr1", "kind": "containment", "lowerLimit": 1, "upperLimit": -1, "type": "Expression"}, 
  {"_class": "Feature", "name": "expr2", "kind": "containment", "lowerLimit": 1, "upperLimit": -1, "type": "Expression"}]}, 
{"_class": "Class", "name": "OrExpression", "superTypes": "Expression", "features": [
  {"_class": "Feature", "name": "expr1", "kind": "containment", "lowerLimit": 1, "upperLimit": -1, "type": "Expression"}, 
  {"_class": "Feature", "name": "expr2", "kind": "containment", "lowerLimit": 1, "upperLimit": -1, "type": "Expression"}]}, 
{"_class": "Class", "name": "NotExpression", "superTypes": "Expression", "features": 
  {"_class": "Feature", "name": "expr", "kind": "containment", "lowerLimit": 1, "upperLimit": -1, "type": "Expression"}}, 
{"_class": "Class", "name": "VarRef", "superTypes": "Expression", "features": 
  {"_class": "Feature", "name": "variable", "kind": "reference", "lowerLimit": 1, "upperLimit": 1, "type": "Variable"}}]
);

