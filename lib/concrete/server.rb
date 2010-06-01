require 'webrick'

module Concrete

class Server

	def initialize(workingSet, dataProvider, htmlRoot, options={})
    @workingSet = workingSet
    @dataProvider = dataProvider
    @htmlRoot = htmlRoot
    @mutex = Mutex.new
		@server = WEBrick::HTTPServer.new(:Port => (options[:port] || 1234))
		@server.mount_proc("/") do |req, res|
      begin
        handleRequest(req, res)
      rescue Exception => e
        puts e
      end
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
			res.body = File.read(@htmlRoot+"/editor.html")
		elsif req.path =~ /^\/html\/(.*)/
      File.open(@htmlRoot+"/"+$1, "rb") do |f|
        res.body = f.read
      end
		elsif req.path =~ /^\/concrete\/(.*)/
      File.open(File.dirname(__FILE__)+"/../../"+$1, "rb") do |f|
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
		
end

end

