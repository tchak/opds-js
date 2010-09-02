
// // //
// OPDS
//
var OPDS = {
  Support: {},
  access: function(feed, callback){
    return OPDS.Feed.parseUrl(feed, callback);
  }
};
