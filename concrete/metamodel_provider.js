// Concrete Model Editor
//
// Copyright (c) 2010 Martin Thiede
//
// Concrete is freely distributable under the terms of an MIT-style license.

Concrete.MetamodelProvider = Class.create({

	initialize: function(metamodelJson, opts) {
		this.metamodel = metamodelJson;
		this.metaclassesByName = {};
		this.metaclasses = [];
		this._extendedChecks = (opts == undefined || !(opts.extended_checks == false));
		this._resolveMetamodel();
	},
	
	_resolveMetamodel: function() {
		var rootClass = {name: "_Root", abstract: true, subTypes: [], superTypes: [], features: []};
		Object.extend(rootClass, Concrete.MetamodelExtension.Class);
		
		var datatypesByName = {};
		this.metamodel.each(function(c) {
			if (c._class == "Class") {
				if (!c.name || c.name.length == 0) throw new Error("Class name is empty");
				if (this.metaclassesByName[c.name]) throw new Error("Class name '"+c.name+"' not unique");
				if (this._extendedChecks) this._extendedClassChecks(c);
				Object.extend(c, Concrete.MetamodelExtension.Class);
				c.subTypes = [];
				if (c.abstract == undefined) c.abstract = false;
				this.metaclassesByName[c.name] = c;
				this.metaclasses.push(c);
			}
			else if (c._class == "Datatype" || c._class == "Enum") {
				if (!c.name || c.name.length == 0) throw new Error("Datatype name is empty");
				if (datatypesByName[c.name]) throw new Error("Datatype name '"+c.name+"' not unique");
				if (this._extendedChecks) this._extendedDatatypeChecks(c);
				Object.extend(c, Concrete.MetamodelExtension.Datatype);
				datatypesByName[c.name] = c;
			}
			else {
				throw new Error ("specify '_class' property, it must be one of [Datatype, Enum, Class]");
			}
		}, this);
		// default datatype in case it is not present
		if (!datatypesByName["String"]) {
			var dt = {name: "String"};
			Object.extend(dt, Concrete.MetamodelExtension.Datatype);
			datatypesByName["String"] = dt;
		}
		this.metaclasses.each(function(c) {
			if (c.superTypes) {
				if (!(c.superTypes instanceof Array)) c.superTypes = [c.superTypes];
				c.superTypes = [rootClass].concat(c.superTypes.collect(function(t) {
					var target = this.metaclassesByName[t];
					if (!target) throw new Error("Can not resolve supertype '"+t+"' in class '"+c.name+"'");
					return target;
				}, this));
			}
			else {
				c.superTypes = [rootClass];
			}
			c.superTypes.each(function(t) {
				t.subTypes.push(c);
			});
			featureNames = {};
			c.features = c.features || [];
			if (!(c.features instanceof Array)) c.features = [c.features];
			c.features.each(function(f) {
				if (!f.name || f.name.length == 0) throw new Error("Feature name is empty in class '"+c.name+"'");
				if (featureNames[f.name]) throw new Error("Feature name '"+f.name+"' not unique in class '"+c.name+"'");
				if (this._extendedChecks) this._extendedFeatureChecks(f, c);
				Object.extend(f, Concrete.MetamodelExtension.Feature);
				f.containingClass = c;
				featureNames[f.name] = true;
				f.kind = f.kind || "attribute";
				if (f.isReference() || f.isContainment()) {
					if (f.type) {
						var target = this.metaclassesByName[f.type];
						if (!target) throw new Error("Can not resolve type '"+f.type+"' in feature '"+f.name+"' class '"+c.name+"'");
						f.type = target;
					}
					else {
						f.type = rootClass;
					}
					if (f.isReference()) {
						f.upperLimit = f.upperLimit || 1;
					}
					else {
						f.upperLimit = f.upperLimit || -1;
					}
					f.lowerLimit = f.lowerLimit || 0;
				}
				else {
					var typename = f.type || "String";
					f.type = datatypesByName[typename];
					if (!f.type) throw new Error("Can not resolve datatype '"+typename+"' in feature '"+f.name+"' class '"+c.name+"'");
					f.upperLimit = f.upperLimit || 1;
					f.lowerLimit = f.lowerLimit || 0;
				}
			}, this);
		}, this);
	},
	
	_extendedDatatypeChecks: function(type) {
		for (p in type) {
			if (!["_class", "name", "documentation", "literals"].include(p)) throw new Error("Unknown property '"+p+"' in type '"+type.name+"'");
		}
		if (type._class != "Enum" && type.literals != undefined) {
			throw new Error("Literals can only be specified for Enums");
		}
		if (type.literals != undefined) {
			if (!(type.literals instanceof Array) || !type.literals.all(function(l) { return Object.isString(l); })) throw new Error("Enum literals must be an Array of Strings in type '"+type.name+"'");
		}
		if (type._class == "Datatype") {
			if (!(["String", "Integer", "Float", "Boolean"].include(type.name))) throw new Error("Plain Datatypes (excluding Enums) must be named one of [String, Integer, Float, Boolean]");
		}
	},

	_extendedClassChecks: function(clazz) {
		for (p in clazz) {
			if (!["_class", "features", "name", "documentation", "superTypes", "abstract"].include(p)) throw new Error("Unknown property '"+p+"' in class '"+clazz.name+"'");
		}
		if (clazz.abstract != undefined) {
			if (clazz.abstract != true && clazz.abstract != false) throw new Error("Abstract property must be true or false in class '"+clazz.name+"'");
		}
	},	

	_extendedFeatureChecks: function(feat, clazz) {
		var loc = " in class '"+clazz.name+"', feature '"+feat.name+"'";
		for (p in feat) {
			if (!["_class", "name", "documentation", "kind", "type", "lowerLimit", "upperLimit"].include(p)) throw new Error("Unknown property '"+p+"'" + loc );
			if (p == "kind") {
				if (!["attribute", "reference", "containment"].include(feat.kind)) throw new Error("Feature kind must be one of 'attribute', 'reference', 'containment'" + loc);
			}
		}
	}
		
});

Concrete.MetamodelExtension = {};

Concrete.MetamodelExtension.Class = {
	
	allSubTypes: function() {
		this.subTypes = this.subTypes || [];
		return this.subTypes.concat(this.subTypes.collect(function(t) { return t.allSubTypes(); })).flatten().uniq();
	},
	
	allSuperTypes: function() {
		this.superTypes = this.superTypes ||  [];
		return this.superTypes.collect(function(t) { return t.allSuperTypes(); }).concat(this.superTypes).flatten().uniq();
	},
	
	allFeatures: function() {
		return this.allSuperTypes().collect(function(t) { return t.features; }).concat(this.features).flatten().uniq();
	}
};
	
Concrete.MetamodelExtension.Datatype = {
	isEnum: function() { return this._class == "Enum"; },
	isString: function() { return this.name == "String"; },
	isInteger: function() { return this.name == "Integer"; },
	isFloat: function() { return this.name == "Float"; },
	isBoolean: function() { return this.name == "Boolean"; }
};

Concrete.MetamodelExtension.Feature = {
	isContainment: function() { return this.kind == "containment"; },
	isReference: function() { return this.kind == "reference"; },
	isAttribute: function() { return this.kind == "attribute"; }
};

