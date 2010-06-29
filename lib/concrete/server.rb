require 'webrick'
begin
  require 'haml'
  require 'sass'
rescue LoadError
end

module Concrete

class Server

	def initialize(workingSet, dataProvider, syntaxProvider, htmlRoot, options={})
    @workingSet = workingSet
    @dataProvider = dataProvider
    @syntaxProvider = syntaxProvider 
    @htmlRoot = htmlRoot
    @logger = options[:logger]
    @hamlEvalContext = options[:hamlEvalContext]
    @mutex = Mutex.new
		@server = WEBrick::HTTPServer.new(:Port => (options[:port] || 1234))
		@server.mount_proc("/") do |req, res|
      handleRequest(req, res)
		end
	end
	
	def start
		@server.start do |sock|
			@server.run(sock)
		end
	end
	
	private

	def handleRequest(req, res)
		if req.path == "/"
      editorHtml = File.read(@htmlRoot+"/editor.html")
      templatesData = htmlTemplatesData(@syntaxProvider.selectedSyntax.dir) if @syntaxProvider.selectedSyntax
      editorHtml.sub!(/<!--\s+html templates\s+-->/, templatesData) if templatesData 
			res.body = editorHtml 
		elsif req.path =~ /^\/html\/(.*)/
      File.open(@htmlRoot+"/"+$1, "rb") do |f|
        res.body = f.read
      end
    elsif req.path =~ /^\/syntax\/(.*)/ && @syntaxProvider.selectedSyntax
      res.body = syntaxFileData(@syntaxProvider.selectedSyntax.dir+"/"+$1)
		elsif req.path =~ /^\/concrete\/(.*)/
      File.open(File.dirname(__FILE__)+"/../../"+$1, "rb") do |f|
        res.body = f.read
      end
		elsif req.path =~ /^\/doc\/(.*)/
      File.open(File.dirname(__FILE__)+"/../../doc/"+$1, "rb") do |f|
        res.body = f.read
      end
		elsif req.path == "/loadIndex"
      @mutex.synchronize do
        res.body = @dataProvider.getAllJsonIndex
      end
    elsif req.path == "/loadModule"
      @mutex.synchronize do
        res.body = @dataProvider.getJsonModel(req.query["module"])
      end
    elsif req.path == "/storeModule"
      @mutex.synchronize do
        identDelim = req.body.index("\n")
        ident = req.body[0..identDelim-1]
        body = req.body[identDelim+1..-1]
        @dataProvider.setJsonModel(ident, body)
      end
    elsif req.path == "/createModule"
      @mutex.synchronize do
        @dataProvider.createModule(req.query["module"])
        res.body = ""
      end
    elsif req.path == "/concreteSyntaxes"
      res.body = @syntaxProvider.syntaxesAsJson 
    elsif req.path == "/setConcreteSyntax"
      @syntaxProvider.selectSyntax(req.query["ident"])
    elsif req.path =~ /\bmetamodel\.js/
      @mutex.synchronize do
        res.body = @dataProvider.metamodelAsJson 
      end
    elsif req.path =~ /\bindex_metamodel\.js/
      @mutex.synchronize do
        res.body = @dataProvider.indexMetamodelAsJson 
      end
		elsif req.path == "/exit"
			@server.shutdown
    elsif req.path =~ /favicon\.ico/
      res.body = ""
    else
      # error
		end
	end	
	
  def syntaxFileData(fileName)
    if haveHaml? && fileName =~ /(\.sass|\.scss)$/
      Sass::Engine.new(File.read(fileName)).render
    else
      File.open(fileName, "rb") do |f|
        f.read
      end
    end
  end
  	
  def htmlTemplatesData(syntaxDir)
    if haveHaml? && File.exist?(syntaxDir + "/templates.haml")
      templatesFile = syntaxDir + "/templates.haml"
      @logger.info("Using HAML templates file #{templatesFile}") if @logger
      engine = Haml::Engine.new(File.read(templatesFile))
      engine.render(@hamlEvalContext || Object.new)
    elsif File.exist?(syntaxDir + "/templates.html")
      templatesFile = syntaxDir + "/templates.html"
      @logger.info("Using HTML templates file #{templatesFile}") if @logger
      File.read(templatesFile)
    end
  end

  def haveHaml?
    begin
      Haml
    rescue NameError
    end
  end
end

end

