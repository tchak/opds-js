require 'rubygems'
require 'jammer'

task :default => :test

desc 'Create bundled and minified source files.'
task :bundle do
  Jammer.root_dir = File.expand_path('../', __FILE__)
  Jammer::Package.bundle!
end

# desc 'Boot test server - run tests at http://localhost:4567/'
# task :test do
#   exec 'cd test && ruby app.rb'
# end
