$:.unshift(File.dirname(__FILE__)+"/../lib")

require 'test/unit'
require 'fileutils'
require 'concrete/file_cache_map'

class FileCacheMapTest < Test::Unit::TestCase

  TestDir = File.dirname(__FILE__)+"/file_cache_map_test/testdir"
 
  def setup
    FileUtils.rm_r(Dir[TestDir+"/*"])
    # * doesn't include dot files
    FileUtils.rm_r(Dir[TestDir+"/.cache"])
    @cm = Concrete::FileCacheMap.new(".cache", ".test")
  end
   
  def test_nocache
    assert_equal(:invalid, @cm.loadData(TestDir+"/fileA"))
  end

  def test_storeload
    keyFile = TestDir+"/fileA"  
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.storeData(keyFile, "valuedata")
    assert(File.exist?(TestDir+"/.cache/fileA.test"))
    assert_equal("valuedata", @cm.loadData(keyFile))
  end

  def test_storeload_subdir
    keyFile = TestDir+"/subdir/fileA"
    FileUtils.mkdir(TestDir+"/subdir")
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.storeData(keyFile, "valuedata")
    assert(File.exist?(TestDir+"/subdir/.cache/fileA.test"))
    assert_equal("valuedata", @cm.loadData(keyFile))
  end

  def test_storeload_postfix
    keyFile = TestDir+"/fileB.txt"  
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.storeData(keyFile, "valuedata")
    assert(File.exist?(TestDir+"/.cache/fileB.txt.test"))
    assert_equal("valuedata", @cm.loadData(keyFile))
  end

  def test_storeload_empty
    keyFile = TestDir+"/fileA"  
    File.open(keyFile, "w") {|f| f.write("")}
    @cm.storeData(keyFile, "valuedata")
    assert(File.exist?(TestDir+"/.cache/fileA.test"))
    assert_equal("valuedata", @cm.loadData(keyFile))
  end

  def test_corruptcache
    keyFile = TestDir+"/fileA"
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.storeData(keyFile, "valuedata")
    File.open(TestDir+"/.cache/fileA.test","a") {|f| f.write("more data")}
    assert_equal(:invalid, @cm.loadData(keyFile))
  end  

  def test_changedcontent
    keyFile = TestDir+"/fileA"
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.storeData(keyFile, "valuedata")
    File.open(keyFile, "a") {|f| f.write("more data")}
    assert_equal(:invalid, @cm.loadData(keyFile))
  end 

  def test_versioninfo
    keyFile = TestDir+"/fileA"  
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.versionInfo = "123"
    @cm.storeData(keyFile, "valuedata")
    assert(File.exist?(TestDir+"/.cache/fileA.test"))
    assert_equal("valuedata", @cm.loadData(keyFile))
  end

  def test_changed_version
    keyFile = TestDir+"/fileA"  
    File.open(keyFile, "w") {|f| f.write("somedata")}
    @cm.versionInfo = "123"
    @cm.storeData(keyFile, "valuedata")
    @cm.versionInfo = "456"
    assert_equal(:invalid, @cm.loadData(keyFile))
  end

end

