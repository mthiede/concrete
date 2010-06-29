require 'rgen/ecore/ecore'

module Concrete

# Objects of this class are meant to be used as HAML eval context
# Context methods provide convenient access to the metamodel
# The metamodel is expected to be a RGen ECore metamodel
class HamlEvalContext
  def initialize(mm)
    @mm = mm
    @metaclassesByName = nil 
  end

  def metaclasses
    loadMetaclasses unless @metaclassesByName 
    @metaclassesByName.values
  end

  def metaclass(name)
    loadMetaclasses unless @metaclassesByName 
    @metaclassesByName[name]
  end

  def metaclassFeatures(name, options={})
    exclusions = options[:except] || []
    if exclusions.is_a?(Array)
      metaclass(name).eAllStructuralFeatures.reject{|f| exclusions.include?(f.name)}
    else
      metaclass(name).eAllStructuralFeatures.reject{|f| exclusions == f.name}
    end
  end

  def metaclassContainments(name, options={})
    metaclassFeatures(name, options).select{|f| f.is_a?(RGen::ECore::EReference) && f.containment}
  end

  def metaclassReferences(name, options={})
    metaclassFeatures(name, options).select{|f| f.is_a?(RGen::ECore::EReference) && !f.containment}
  end
  
  def metaclassAttributes(name, options={})
    metaclassFeatures(name, options).select{|f| f.is_a?(RGen::ECore::EAttribute)}
  end

  private

  def loadMetaclasses
    @metaclassesByName = {}
    @mm.eAllClasses.each do |c|
      @metaclassesByName[c.name] = c
    end
  end

end

end

