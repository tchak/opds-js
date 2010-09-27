//= require "vendor"

/**
 * Module containing the whole OPDS parsing library
 */
var OPDS = {
  Support: {},
  /**
   * Convinience call to Feed.parseUrl
	 * @see Feed.parseUrl
	 * @return (see Feed.parseUrl)
	 */
  access: function(feed, callback){
    return OPDS.Feed.parseUrl(feed, callback);
  }
};

//= require "parser"
//= require "support/browser"
//= require "support/linkset"
//= require "feed"
//= require "entry"
