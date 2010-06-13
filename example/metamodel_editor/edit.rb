require 'webrick'

#
# Simple ajax interaction with Concrete editor
#
# Adapt the path to the browser (Firefox or Chrome) below.
# Startup the browser before you run this script, otherwise it might hang.
#
Browser = "firefox"
Port = 1234

class ConcreteServer
	
	def initialize(file)
		@file = file
		@server = WEBrick::HTTPServer.new(:Port => Port)
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
			res.body = File.read("metamodel_editor.html").sub("<!-- json model here -->", File.read(@file))
		elsif req.path == "/save"
			File.open(@file, "w") {|f| f.write(req.body)}
		elsif req.path == "/exit"
			@server.shutdown
    elsif req.path == "/favicon.ico"
      # ignore
		else
			res.body = File.read("../.."+req.path)
		end
	end	
		
end

if (ARGV.size == 0)
	puts "Usage: edit.rb <json file>"
	exit
end

# if the browser is not yet running the following line might block
system "#{Browser} http://localhost:#{Port}/"
ConcreteServer.new(ARGV[0]).start

