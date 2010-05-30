$:.unshift(File.dirname(__FILE__)+"/../lib")

require 'test/unit'
require 'fileutils'
require 'concrete/working_set'

class WorkingSetTest < Test::Unit::TestCase

  TestDir = File.dirname(__FILE__)+"/working_set_test"
 
  def test_addremove
    ws = Concrete::WorkingSet.new(File.dirname(__FILE__))
    addTestFiles(ws)
    assert_equal ["working_set_test/file1.txt", "working_set_test/file2", "working_set_test/subdir/file3.xml"], ws.fileIdentifiers
    ws.addFile(TestDir+"/file1.txt")
    assert_equal ["working_set_test/file1.txt", "working_set_test/file2", "working_set_test/subdir/file3.xml"], ws.fileIdentifiers
    ws.removeFile(TestDir+"/file1.txt")
    assert_equal ["working_set_test/file2", "working_set_test/subdir/file3.xml"], ws.fileIdentifiers
    ws.removeFile(TestDir+"/file2")
    assert_equal ["working_set_test/subdir/file3.xml"], ws.fileIdentifiers
    ws.removeFile(TestDir+"/subdir/file3.xml")
    assert_equal [], ws.fileIdentifiers
    ws.removeFile(TestDir+"/file2")
    assert_equal [], ws.fileIdentifiers
  end

  def test_addremove_root2
    ws = Concrete::WorkingSet.new(File.dirname(__FILE__)+"/..")
    addTestFiles(ws)
    assert_equal ["test/working_set_test/file1.txt", "test/working_set_test/file2", "test/working_set_test/subdir/file3.xml"], ws.fileIdentifiers
  end

  def test_addremove_root3
    ws = Concrete::WorkingSet.new(File.dirname(__FILE__)+"/working_set_test")
    addTestFiles(ws)
    assert_equal ["file1.txt", "file2", "subdir/file3.xml"], ws.fileIdentifiers
  end
  
  def test_getFile
    ws = Concrete::WorkingSet.new(File.dirname(__FILE__))
    addTestFiles(ws)
    file1 = ws.getFile("working_set_test/file1.txt")
    assert file1.index("working_set_test/file1.txt") > 0
    assert File.exist?(file1) 
  end

  def addTestFiles(ws)
    ws.addFile(TestDir+"/file1.txt")
    ws.addFile(TestDir+"/file2")
    ws.addFile(TestDir+"/subdir/file3.xml")
  end

end
 
