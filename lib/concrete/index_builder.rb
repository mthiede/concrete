require 'mmgen/metamodel_generator'
require 'andand'
require 'tempfile'

module Concrete

class IndexBuilder

  include MMGen::MetamodelGenerator

  def initialize(mm, options={})
    @mm = mm
    @identName = options[:identifierName] || "name"
    @ignoreReferences = options[:ignoreReferences]
    @moduleClassName = options[:moduleClassName] || "Module"
  end

  def indexMetamodel
    @indexMM ||= buildIndexMetamodel
  end

  # rootElement itself is not part of the index
  def buildIndex(root)
    index = indexMetamodel.const_get(@moduleClassName).new
    buildIndexInternal(root, index)
    index
  end

  private

  def buildIndexMetamodel
    env = RGen::Environment.new

    allContainersCache = {}
    processedClasses = {}
    referencedClasses = []
    @mm.ecore.eAllClasses.eReferences.each do |r|
      next if r.containment || r.derived
      next if @ignoreReferences.andand.call(r)
      next if processedClasses[r.eType]
      processedClasses[r.eType] = true
      allNamedSubclasses(r.eType).each do |c|
        referencedClasses |= ([c] + allContainers(c, allContainersCache))
      end
    end

    package = env.new(RGen::ECore::EPackage, :name => "IndexMetamodel")
    indexElement = env.new(RGen::ECore::EClass, :name => "IndexElement", :ePackage => package)
    env.new(RGen::ECore::EAttribute, :name => "name", :eType => RGen::ECore::EString, :eContainingClass => indexElement)
    env.new(RGen::ECore::EReference, :name => "elements", :upperBound => -1, :containment => true, :eType => indexElement, :eContainingClass => indexElement)
    env.new(RGen::ECore::EClass, :name => @moduleClassName, :eSuperTypes => [indexElement], :ePackage => package)
    
    @mm.ecore.eAllClasses.each do |c|
      if !c.abstract && referencedClasses.include?(c) 
        env.new(RGen::ECore::EClass, :name => c.name, :eSuperTypes => [indexElement], :ePackage => package)
      end
    end

    loadIndexMetamodel(package)
  end

  def allNamedSubclasses(clazz)
    if clazz.eAllStructuralFeatures.any?{|f| f.name == @identName}
      [clazz] + clazz.eAllSubTypes
    else
      clazz.eAllSubTypes.select{|t| t.eAllStructuralFeatures.any?{|f| f.name == @identName}}
    end
  end

  def loadIndexMetamodel(indexMMPackage)
    mmFile = Tempfile.new("index_metamodel")
    mmFile.close 
    generateMetamodel(indexMMPackage, mmFile.path)
    containerName = "MMContainer"+self.object_id.to_s
    eval("module "+containerName+"; end")
    container = self.class.const_get(containerName) 
    container.module_eval(File.read(mmFile.path))
    mmFile.unlink
    container.const_get(indexMMPackage.name)
  end

  def buildIndexInternal(element, parent)
    element.class.ecore.eAllReferences.select{|r| r.containment}.each do |r|
      values = element.getGeneric(r.name)
      values = [values] unless values.is_a?(Array)
      values.compact!
      values.each do |v|
        next unless indexMetamodel.const_defined?(v.class.ecore.name)
        next unless v.respond_to?(@identName)
        ie = indexMetamodel.const_get(v.class.ecore.name).new
        ie.name = v.getGeneric(@identName)
        parent.addElements(ie)
        buildIndexInternal(v, ie)
      end
    end
  end

  def containers(c)
    types = c.eAllReferences.select{|r| r.eOpposite && r.eOpposite.containment}.eType
    types + types.eAllSubTypes
  end

  def allContainers(c, cache)
    return cache[c] if cache[c]
    cache[c] = []
    cons = containers(c)
    cache[c] = cons | cons.collect{|cn| allContainers(cn, cache)}.flatten
  end

  end

end

