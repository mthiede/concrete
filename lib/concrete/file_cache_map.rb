require 'digest'
require 'fileutils'

module Concrete

# Implements a cache for storing and loading data associated with arbitrary files.
# The data is stored in cache files within a subfolder of the folder where
# the associated files exists.
# The cache files are protected with a checksum and loaded data will be
# invalid in case either the associated file are the cache file has changed.
#
class FileCacheMap
  # optional program version info to be associated with the cache files
  # if the program version changes, cached data will also be invalid
  attr_accessor :versionInfo

  # +cacheDir+ is the name of the subfolder where cache files are created
  # +postfix+ is an extension appended to the original file name in order to
  # create the name of the cache file
  def initialize(cacheDir, postfix)
    @postfix = postfix
    @cacheDir = cacheDir
  end

  # load data associated with file +keyPath+
  # returns :invalid in case either the associated file or the cache file has changed
  def loadData(keyPath)
    cf = cacheFile(keyPath)
    return :invalid unless File.exist?(cf)
    result = nil
    File.open(cf, "rb") do |f|
      checksum = f.read(41)[0..39]
      data = f.read
      if calcSha1(data) == checksum
        if calcSha1(keyData(keyPath)) == data[0..39]
          result = data[41..-1]
        else
          result = :invalid
        end
      else
        result = :invalid
      end
    end 
    result
  end

  # store data +valueData+ associated with file +keyPath+
  def storeData(keyPath, valueData)
    data = calcSha1(keyData(keyPath)) + "\n" + valueData
    data = calcSha1(data) + "\n" + data
    cf = cacheFile(keyPath)
    FileUtils.mkdir(File.dirname(cf)) unless File.exist?(File.dirname(cf))
    File.open(cf, "wb") do |f|
      f.write(data)
    end 
  end

  # remove cache files which are not associated with any file in +keyPaths+
  # will only remove files within +rootPath+
  def cleanUnused(rootPath, keyPaths)
    raise "key paths must be within root path" unless keyPaths.all?{|p| p.index(rootPath) == 0}
    usedFiles = keyPaths.collect{|p| cacheFile(p)}
    files = Dir[rootPath+"/**/"+@cacheDir+"/*"+@postfix] 
    files.each do |f|
      FileUtils.rm(f) unless usedFiles.include?(f)
    end
  end

private
  
  def keyData(path)
    File.read(path)+@versionInfo.to_s
  end

  def cacheFile(path)
    File.dirname(path) + "/"+@cacheDir+"/" + File.basename(path) + @postfix 
  end

  def calcSha1(data)
    sha1 = Digest::SHA1.new
    sha1.update(data)
    sha1.hexdigest
  end
   
end

end

