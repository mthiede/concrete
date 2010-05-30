module Concrete

module Util

class StringWriter
  attr_reader :string
  def initialize
    @string = ""
  end
  def write(s)
    @string << s
  end
end

end

end
