module Concrete

class ConcreteSyntaxProvider

  class ConcreteSyntax
    attr_accessor :ident, :dir, :name, :desc, :htmlTemplates, :cssStyleFile
  end

  def initialize(configDirs, logger)
    @configDirs = configDirs
    @logger = logger
    @selectedSyntax = nil 
  end

  def selectedSyntax
    @selectedSyntax || syntaxes.first
  end

  def selectSyntax(ident)
    @selectedSyntax = syntaxes.find{|s| s.ident == ident}
  end

  def syntaxesAsJson
    '{ "syntaxes": [' + syntaxes.collect do |s| 
      '{ "ident": "'+s.ident+'", "name": "'+s.name+'" }'
    end.join(", ") + '], "selected": "'+@selectedSyntax.andand.ident.to_s+'" }'
  end

  def syntaxes
    result = []
    @configDirs.each do |cd|
      Dir.entries(cd).sort.each do |sd|
        next if sd == "." || sd == ".."
        syntaxDir = cd+"/"+sd
        templatesFile = syntaxDir + "/templates.html"
        styleFile = syntaxDir + "/style.css"
        unless File.exist?(templatesFile) || File.exist?(styleFile)
          @logger.warn("Concrete syntax dir without a templates.html or a style.css: #{syntaxDir}")
          next
        end
        s = ConcreteSyntax.new
        s.ident = syntaxDir.gsub("\\","/")
        s.dir = syntaxDir
        s.name = sd
        s.desc = ""
        s.cssStyleFile = styleFile if File.exist?(styleFile)
        s.htmlTemplates = File.read(templatesFile) if File.exist?(templatesFile)
        result << s 
      end
    end
    result
  end
   
end

end

