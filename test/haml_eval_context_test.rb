$:.unshift File.join(File.dirname(__FILE__),"..","lib")

require 'test/unit'
require 'rgen/environment'
require 'rgen/array_extensions'
require 'rgen/ecore/ecore'
require 'concrete/haml_eval_context'
begin
  require 'haml'
rescue LoadError
end

class HamlEvalContextTest < Test::Unit::TestCase

  def test_simple
    return unless haveHaml?
    context = Concrete::HamlEvalContext.new(RGen::ECore.ecore)
    engine = Haml::Engine.new("= metaclass('EClass').name")  
    assert_equal "EClass\n", engine.render(context)
    engine = Haml::Engine.new("= metaclasses.size")  
    assert_equal "18\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassFeatures('EEnum').size")  
    assert_equal "8\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassContainments('EEnum').size")  
    assert_equal "2\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassReferences('EEnum').size")  
    assert_equal "1\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassAttributes('EEnum').size")  
    assert_equal "5\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassAttributes('EEnum', :except => ['name']).size")  
    assert_equal "4\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassAttributes('EEnum', :except => 'name').size")  
    assert_equal "4\n", engine.render(context)
    engine = Haml::Engine.new("= metaclassAttributes('EEnum', :except => 'namex').size")  
    assert_equal "5\n", engine.render(context)
  end

  def haveHaml?
    begin
      Haml
    rescue NameError
    end
  end

end

