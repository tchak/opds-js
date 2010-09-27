require 'rubygems'
require 'sinatra'
require 'json'
require 'erb'

def json!
  content_type 'application/json'
end

get '/' do
  erb :index
end

get '/opds-js.js' do
  content_type 'application/x-javascript'
  File.read("../build/opds.standalone.js")
end

get '/tests/:name' do
  content_type 'application/x-javascript'
  File.read("tests/#{params[:name]}")
end

get '/navigation.atom' do
  content_type 'application/atom+xml'
  File.read("fixtures/navigation.txt")
end

get '/acquisition.atom' do
  content_type 'application/atom+xml'
  File.read("fixtures/acquisition.txt")
end

get '/entry.atom' do
  content_type 'application/atom+xml'
  File.read("fixtures/entry.txt")
end
