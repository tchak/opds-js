//= require "parser"
//= require "support/browser"
//= require "support/linkset"
//= require "feed"
//= require "entry"

// // //
// OPDS
//
var OPDS = {
  Support: {},
  access: function(feed, callback){
    return OPDS.Feed.parseUrl(feed, callback);
  }
};
