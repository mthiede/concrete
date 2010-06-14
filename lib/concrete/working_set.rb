require 'pathname'

module Concrete

class WorkingSet

  def initialize(root)
    @root = Pathname.new(root).realpath
    @filesByIdent = {}
  end

  def addFile(file)
    @filesByIdent[ident(file)] = file
  end
 
  def removeFile(file)
    @filesByIdent.delete(ident(file)) 
  end

  def fileIdentifiers
    @filesByIdent.keys.sort
  end

  def getFile(fileIdent)
    @filesByIdent[fileIdent]
  end

  def rootPath
    @root.to_s
  end
 
  private
  
  def ident(file)
    Pathname.new(file).realpath.relative_path_from(@root).cleanpath.to_s
  end
     
end

end

