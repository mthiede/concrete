module Concrete

class Config

  def initialize(filename)
    @filename = filename
  end

  def loadValue(key)
    loadConfig[key]
  end

  def storeValue(key, value)
    config = loadConfig
    config[key] = value
    File.open(@filename, "w") do |f|
      YAML.dump(config, f)
    end
  end
  
  private
  
  def loadConfig
    if File.exist?(@filename)
      YAML.load_file(@filename) 
    else
      {}
    end
  end

end

end 
