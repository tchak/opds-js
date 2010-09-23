
// // //
// Browser
//
OPDS.Support.Browser = Class.$extend({
	goTo: function(uri, callback){
		var url = new URI(uri).toString();
		var browser = this;
		this.lastResponse = null;
		this.currentLocation = url;
    try {
		  $.get(url, function(data, status, response){
		    browser.lastResponse = response;
		    callback.apply(browser, [browser]);
		  });
		} catch (e) {
		  if (jQuery.browser.msie && window.XDomainRequest) {
        // Use Microsoft XDR
        var xdr = new XDomainRequest();
        xdr.open("get", url);
        xdr.onload = function(){
          browser.lastResponse = this;
          callback.apply(browser, [browser]);
        };
        xdr.send();
      } else {
        console.log("An error occured or your browser is to old for this...");
      }
		}
	},
  
	isOk: function(){
	  return this.status() == 200;
	},
  
	status: function(){
	  return this.lastResponse ? this.lastResponse.status : null;
	},
  
  headers: function(){
   return this.lastResponse ? this.lastResponse.getAllResponseHeaders() : null;
  },
  
	body: function(){
		return this.lastResponse ? this.lastResponse.responseText: null;
	},
  
	discover: function(url, callback){
	  this.goTo(url, function(browser){
	    if (browser.isOk()){
  		  var wrapper = {rawDoc: $(browser.body())};
  			OPDS.Support.LinkSet.extract(wrapper, '[type="application/atom+xml;type=entry;profile=opds-catalog"], [type="application/atom+xml;profile=opds-catalog"]');
  			if (wrapper.links.size() == 0){
  			  callback.call(browser, false);
  			}
  			callback.call(browser, wrapper.links);
  		} else {
  			callback.call(browser, false);
  		}
	  });
  }
});