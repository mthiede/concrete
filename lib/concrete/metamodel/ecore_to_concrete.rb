require 'rgen/transformer'
require 'rgen/ecore/ecore'
require 'concrete/metamodel/concrete_mmm'

module Concrete

module Metamodel

class ECoreToConcrete < RGen::Transformer
  include RGen::ECore

  def initialize(env_in, env_out, opts={})
    super
    @featureFilter = opts[:featureFilter]
  end
   
  def transform
    uniqueClassNameCheck
    trans(:class => EClass)
  end

  transform EClass, :to => ConcreteMMM::Class do
    { :name => name,
      :abstract => abstract, 
      :features => trans(eStructuralFeatures.reject{ |f| 
        (f.is_a?(RGen::ECore::EReference) && f.eOpposite && f.eOpposite.containment) || 
        (@featureFilter && !@featureFilter.call(f)) }),
      :superTypes => trans(eSuperTypes)
    }
  end
 
  transform EStructuralFeature, :to => ConcreteMMM::Feature do
    if eType.is_a?(EDataType) && !eType.is_a?(EEnum)
      _type = primitiveType(eType)
    else
      _type = trans(eType)
    end
    { :name => name,
      :type => _type,
      :kind => (@current_object.is_a?(EAttribute) ? :attribute : (containment ? :containment : :reference)),
      :lowerLimit => lowerBound,
      :upperLimit => upperBound
    } 
  end
  
  transform EEnum, :to => ConcreteMMM::Enum do
    { :name => name,
      :literals => eLiterals.collect{|l| l.name}
    }
  end
 
  def primitiveType(eType)
    @primitiveType ||= {}
    return @primitiveType[eType] if @primitiveType[eType]
    if eType == EString
      @primitiveType[eType] = @env_out.new(ConcreteMMM::Datatype, :name => "String")
    elsif eType == EInt
      @primitiveType[eType] = @env_out.new(ConcreteMMM::Datatype, :name => "Integer")
    elsif eType == EFloat
      @primitiveType[eType] = @env_out.new(ConcreteMMM::Datatype, :name => "Float")
    elsif eType == EBoolean
      @primitiveType[eType] = @env_out.new(ConcreteMMM::Datatype, :name => "Boolean")
    else
      # ignore unsupported datatype
    end
  end

  def uniqueClassNameCheck
    classNames = {}
    @env_in.find(:class => EClass).each do |c|
      raise "unqualified class names not unique, concrete does not support packages" if classNames[c.name]
      classNames[c.name] = true
    end
  end
end 

end

end

