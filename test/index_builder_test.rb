$:.unshift(File.dirname(__FILE__)+"/../lib")

require 'test/unit'
require 'fileutils'
require 'rgen/array_extensions'
require 'rgen/model_builder/model_serializer'
require 'concrete/index_builder'

class IndexBuilderTest < Test::Unit::TestCase

  TestDir = File.dirname(__FILE__)+"/index_builder_test"

  def test_index_metamodel
    builder = Concrete::IndexBuilder.new(RGen::ECore)
    mm = builder.indexMetamodel
    assert_equal [
      "EAttribute", "EClass", "EClassifier", "EDataType",
      "EEnum", "EEnumLiteral", "ENamedElement", "EOperation",
      "EPackage", "EParameter", "EReference", "EStructuralFeature",
      "ETypedElement", "IndexElement", "Module"
    ], mm.ecore.eAllClasses.name.sort
  end

  def test_index_metamodel_reference_only
    builder = Concrete::IndexBuilder.new(RGen::ECore, :ignoreReferences => proc{|r| r.eType.name != "EReference"})
    mm = builder.indexMetamodel
    # metamodel should only contain the EReference class and its container classes and base elements
    assert_equal [
      "EClass",
      "EPackage", "EReference",
      "IndexElement", "Module"
    ], mm.ecore.eAllClasses.name.sort
  end

  def test_index_metamodel_different_ident_name
    builder = Concrete::IndexBuilder.new(RGen::ECore, :identifierName => "theName")
    mm = builder.indexMetamodel
    # metamodel should only contain the base elements 
    assert_equal [
      "IndexElement", "Module"
    ], mm.ecore.eAllClasses.name.sort
  end

  def test_index_metamodel_module_class_name
    builder = Concrete::IndexBuilder.new(RGen::ECore, :moduleClassName => "File")
    mm = builder.indexMetamodel
    assert mm.ecore.eAllClasses.all?{|c| c.name != "Module"}
    assert mm.ecore.eAllClasses.any?{|c| c.name == "File"}
  end

  def test_metamodel_loaded
    builder = Concrete::IndexBuilder.new(RGen::ECore)
    mm = builder.indexMetamodel
    assert mm.is_a?(Module)
    assert mm::IndexElement.is_a?(Class)
  end

  def test_build_index
    builder = Concrete::IndexBuilder.new(RGen::ECore)
    index = builder.buildIndex(RGen::ECore.ecore)
    index.name = "TestModule"
    File.open(TestDir+"/ecore_index.rb","w") do |f|
      serializer = RGen::ModelBuilder::ModelSerializer.new(f, builder.indexMetamodel.ecore)
      serializer.serialize(index)
    end
    assert_equal File.read(TestDir+"/ecore_index_expected.rb"), File.read(TestDir+"/ecore_index.rb")
  end

end
