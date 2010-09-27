/**
 * Browser class, it will be used to access the Internet.
 * Currently based on jQuery ajax and provide IE8/9 cross domain request support
 */
OPDS.Support.Browser = Class.$extend({
  /**
   * Navigate to the provided uri
	 * @param uri [String] uri to go to
	 * @param callback
	 */
	goTo: function(uri, callback){
		var url = new URI(uri).str();
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
        var xdr = new XDomainRequest();
        xdr.open("get", url);
        xdr.onload = function(){
          browser.lastResponse = this;
          browser.lastResponse.status = 200;
          callback.apply(browser, [browser]);
        };
        xdr.onerror = function(){
          browser.lastResponse = this;
          browser.lastResponse.status = -1;
          callback.apply(browser, [browser]);
        }
        xdr.send();
      } else {
        alert("Your browser is unable to load crossdomain requests!");
		  }
		}
	},

  /**
   * Last page load was ok ?
	 * @return [boolean]
	 */
	isOk: function(){
	  return this.status() == 200;
	},
  
  /**
   * @return [integer] Last page load return code
	 */
	status: function(){
	  return this.lastResponse ? this.lastResponse.status : null;
	},

  /**
   * @return [String] Last page body
	 */
	body: function(){
		return this.lastResponse ? this.lastResponse.responseText: null;
	},

  /**
   * Try to discover catalog links at the given url
	 * @param [String] url to search
	 * @return [OPDS.Support.LinkSet, false] discovered links
	 */
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
