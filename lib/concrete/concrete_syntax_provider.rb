require 'andand'

module Concrete

class ConcreteSyntaxProvider

  class ConcreteSyntax
    attr_accessor :ident, :dir, :name, :desc
  end

  def initialize(configDirs, logger, config=nil)
    @configDirs = configDirs
    @logger = logger
    @config = config
    @selectedSyntax = nil 
  end

  def selectedSyntax
    syn = syntaxes
    storedIdent = @config.andand.loadValue("concrete_syntax") 
    storedSyntax = syn.find{|s| s.ident == storedIdent} if storedIdent
    storedSyntax || @selectedSyntax || syn.first
  end

  def selectSyntax(ident)
    @selectedSyntax = syntaxes.find{|s| s.ident == ident}
    @config.andand.storeValue("concrete_syntax", ident.to_s) if @selectedSyntax
  end

  def syntaxesAsJson
    '{ "syntaxes": [' + syntaxes.collect do |s| 
      '{ "ident": "'+s.ident+'", "name": "'+s.name+'" }'
    end.join(", ") + '], "selected": "'+@selectedSyntax.andand.ident.to_s+'" }'
  end

  def syntaxes
    result = []
    @configDirs.each do |cd|
      next unless File.exist?(cd)
      Dir.entries(cd).sort.each do |sd|
        next if sd == "." || sd == ".."
        syntaxDir = cd+"/"+sd
        s = ConcreteSyntax.new
        s.ident = syntaxDir.gsub("\\","/")
        s.dir = syntaxDir
        s.name = sd.split(/[_\W]/).collect{|w| w.capitalize}.join(" ")
        s.desc = ""
        result << s 
      end
    end
    result
  end

end

end

