$:.unshift File.join(File.dirname(__FILE__),"..","lib")

require 'test/unit'
require 'rgen/environment'
require 'rgen/serializer/json_serializer'
require 'rgen/instantiator/json_instantiator'
require 'concrete/metamodel/concrete_mmm'
require 'concrete/metamodel/ecore_to_concrete'

class MetamodelTest < Test::Unit::TestCase
  include Concrete::Metamodel

  TestDir = File.dirname(__FILE__)+"/metamodel_test"
  def test_ecore_to_concrete
    env = RGen::Environment.new
    outfile = TestDir + "/concrete_mmm_generated.js"
    ECoreToConcrete.new(nil, env).trans(ConcreteMMM.ecore.eClasses)
    File.open(outfile, "w") do |f|
      ser = RGen::Serializer::JsonSerializer.new(f)
      ser.serialize(env.find(:class => ConcreteMMM::Classifier).sort{|a,b| a.name <=> b.name})
    end
    assert_equal File.read(TestDir+"/concrete_mmm_expected.json").strip, File.read(outfile).strip
  end

  def test_json_roundtrip
    env = RGen::Environment.new
    inst = RGen::Instantiator::JsonInstantiator.new(env, ConcreteMMM)
    infile = TestDir + "/concrete_mmm_expected.json"
    inst.instantiate(File.read(infile))
    outfile = TestDir + "/concrete_mmm_regenerated.js"
    File.open(outfile, "w") do |f|
      # mark unresolved references, there should be no unresolved references
      ser = RGen::Serializer::JsonSerializer.new(f, :identifierProvider => proc{|e| e.is_a?(RGen::MetamodelBuilder::MMProxy) && "xxx"})
      ser.serialize(env.find(:class => ConcreteMMM::Classifier).sort{|a,b| a.name <=> b.name})        
    end
    assert_equal File.read(infile).strip, File.read(outfile).strip
  end

end
	
