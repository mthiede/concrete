require 'rgen/metamodel_builder'

module Concrete

module Metamodel

# Concrete meta-metamodel
module ConcreteMMM
  extend RGen::MetamodelBuilder::ModuleExtension
  include RGen::MetamodelBuilder::DataTypes

  FeatureKindType = Enum.new(:name => "FeatureKind", :literals =>[ :attribute, :reference, :containment ])

  class Classifier < RGen::MetamodelBuilder::MMBase
    abstract
    has_attr 'name', String
  end

  class Class < Classifier 
    has_attr 'abstract', Boolean
  end
  Class.has_many 'superTypes', Class

  class Datatype < Classifier
  end

  class Enum < Datatype
    has_many_attr 'literals', String
  end

  class Feature < RGen::MetamodelBuilder::MMBase
    has_attr 'name', String
    has_attr 'kind', FeatureKindType
    has_attr 'lowerLimit', Integer
    has_attr 'upperLimit', Integer
    has_one 'type', Classifier
  end
  Class.contains_many 'features', Feature, 'containingClass'

end

end

end

