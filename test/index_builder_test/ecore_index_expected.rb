ePackage "ECore" do
  eClass "EDataType" do
    eAttribute "serializable"
  end
  eClass "ETypedElement" do
    eAttribute "lowerBound"
    eAttribute "ordered"
    eAttribute "unique"
    eAttribute "upperBound"
    eAttribute "many"
    eAttribute "required"
    eReference "eType"
  end
  eClass "EFactory" do
    eReference "ePackage"
  end
  eClass "EPackage" do
    eAttribute "nsPrefix"
    eAttribute "nsURI"
    eReference "eClassifiers"
    eReference "eSubpackages"
    eReference "eSuperPackage"
    eReference "eFactoryInstance"
  end
  eClass "EModelElement" do
    eReference "eAnnotations"
  end
  eClass "EStructuralFeature" do
    eAttribute "changeable"
    eAttribute "defaultValue"
    eAttribute "defaultValueLiteral"
    eAttribute "derived"
    eAttribute "transient"
    eAttribute "unsettable"
    eAttribute "volatile"
    eReference "eContainingClass"
  end
  eClass "EStringToStringMapEntry" do
    eAttribute "key"
    eAttribute "value"
  end
  eClass "ENamedElement" do
    eAttribute "name"
  end
  eClass "EEnumLiteral" do
    eAttribute "literal"
    eAttribute "value"
    eReference "eEnum"
  end
  eClass "EClassifier" do
    eAttribute "defaultValue"
    eAttribute "instanceClass"
    eAttribute "instanceClassName"
    eReference "ePackage"
  end
  eClass "EAttribute" do
    eAttribute "iD"
    eReference "eAttributeType"
  end
  eClass "EParameter" do
    eReference "eOperation"
  end
  eClass "EClass" do
    eAttribute "abstract"
    eAttribute "interface"
    eReference "eIDAttribute"
    eReference "eAllAttributes"
    eReference "eAllContainments"
    eReference "eAllOperations"
    eReference "eAllReferences"
    eReference "eAllStructuralFeatures"
    eReference "eAllSuperTypes"
    eReference "eAttributes"
    eReference "eReferences"
    eReference "eOperations"
    eReference "eStructuralFeatures"
    eReference "eSuperTypes"
    eReference "eSubTypes"
  end
  eClass "EAnnotation" do
    eAttribute "source"
    eReference "eModelElement"
    eReference "details"
    eReference "contents"
    eReference "references"
  end
  eClass "EEnum" do
    eReference "eLiterals"
  end
  eClass "EOperation" do
    eReference "eContainingClass"
    eReference "eParameters"
    eReference "eExceptions"
  end
  eClass "EObject"
  eClass "EReference" do
    eAttribute "container"
    eAttribute "containment"
    eAttribute "resolveProxies"
    eReference "eOpposite"
    eReference "eReferenceType"
  end
end
