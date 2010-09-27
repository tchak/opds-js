/**
 * A link is actually an array composed as :
 * [rel, url , title, mimetype, opds:price, opds:currency]
 */
OPDS.Support.Link = Class.$extend({
  __init__: function(array, browser){
	  this.browser = browser || new OPDS.Support.Browser();
	  if (this.browser.currentLocation){
		  array[1] = URI.join(this.browser.currentLocation, array[1]).str();
		}
		/**
		 * @return [String] link rel
		 */
		this.rel = array[0] || null;
		/**
		 * @return [String] link url
		 */
		this.url = array[1] || null;
		/**
		 * @return [String] link title
		 */
		this.title = array[2] || null;
		/**
		 * @return [String] link type
		 */
		this.type = array[3] || null;
		/**
		 * @return [String] link price
		 */
		this.price = array[4] || null;
		/**
		 * @return [String] link currency
		 */
		this.currency = array[5] || null;
	},

  /**
   * Will go parsing the resource at this url.
	 * Proxy to Feed.parseUrl
	 * @see Feed.parseUrl
	 * @return (see Feed.parseUrl)
	 */
  navigate: function(callback){
	  return OPDS.Feed.parseUrl(this.url, callback, this.browser);
	},

  inspect: function(){
  }
});

/**
 * Set of links.
 *
 * It provides ways to query and filter the set
 */
OPDS.Support.LinkSet = Class.$extend({
  /**
   * @param browser (see Feed.parseUrl) 
   */
  __init__: function(browser){
	  this.browser = browser || new OPDS.Support.Browser();
	  this.length = 0;
		this.store = {
		  rel: {},
		  txt: {},
		  link: {},
		  type: {}
		};
	},

  __classvars__: {
    extract: function(element, expr){
      element.links = new OPDS.Support.LinkSet(element.browser);
      element.rawDoc.find(expr).each(function(i, n){
        var text = null,
            linkElem = $(n);
        if (linkElem.attr('title')){
          text = linkElem.attr('title');
        }
        var link = linkElem.attr('href');
        var type = linkElem.attr('type') ? linkElem.attr('type') : null;
        if (linkElem.attr('rel')){
          _.each(linkElem.attr('rel').split(), function(rel){
            element.links.push(rel, link, text, type);
          });
        } else {
          element.links.push(null, link, text, type);
        }
      });
    }
  },

  /**
   * Add a link to the set 
	 * @param key [String] rel value where to add the link
	 * @param value [Array] remainder of link structure
	 */
  set: function(key, value){
	  var link = new OPDS.Support.Link([key].concat(value), this.browser);
	  var s = this.store, i = this.length;
		Array.prototype.push.apply(this, [link]);
		if (!s.rel[key]){
		  s.rel[key] = [];
		}
		s.rel[key].push(i);
		if (!s.txt[value[1]]){
		  s.txt[value[1]] = [];
		}
		s.txt[value[1]].push(i)
		if (!s.link[_.first(value)]){
		  s.link[_.first(value)] = [];
		}
		s.link[_.first(value)].push(i);
		if (!s.type[_.last(value)]){
		  s.type[_.last(value)] = [];
		}
		s.type[_.last(value)].push(i)
	},

	get: function(key){
    return this.remap(this.store.rel[key]);
	},

  /**
   * Push a link to the set 
	 * @param rel (see Link#rel)
	 * @param link (see Link#url)
	 * @param text (see Link#title)
	 * @param price (see Link#price)
	 * @param currency (see Link#currency)
	 */
	push: function(rel, link, text, type){
	  this.set(rel, [link, text, type]);
	},

  /**
   * Find first link url corresponding to the query
	 * @example Query : 
	 * { 'rel': "related" }
	 */
	linkUrl: function(k){
  },

  /**
   * Find first link rel corresponding to the query
	 * @example Query : 
	 * { 'rel': "related" }
	 */
	linkRel: function(k){
	},

  /**
   * Find first link text corresponding to the query
	 * @example Query : 
	 * { 'rel': "related" }
	 */
	linkText: function(k){
	},

  /**
   * Find first link type corresponding to the query
	 * @example Query : 
	 * { 'rel': "related" }
	 */
	linkType: function(k){
	},

  /**
   * Collection indexed by given type
	 * @param [String] in ('link', 'rel', 'txt', 'type')
	 */
  by: function(type){
    var hash = {};
    _.each(this.store[type], function(value, key){
      return hash[key] = this.remap(value);
    }, this);
    return hash;
  },

  /**
   * @return [Array] all links
   */
	links: function(){
		return _.keys(this.store.link);
	},

  /**
   * @return [Array] all rels
   */
	rels: function(){
		return _.keys(this.store.rel);
	},

  /**
   * @return [Array] all titles
   */
	texts: function(){
		return _.keys(this.store.txt);
	},

	inspect: function(){

	},

  /**
   * @return [Link] First link in store
	 */
	first: function(){
	  return _.first(this);
	},

  /**
   * @return [Link] Last link in store
	 */
  last: function(){
		return _.last(this);
	},

  /**
   * recover links for an index table
   * @param [Array] Indexes
	 * @return [Array] Corresponding links
	 */
	remap: function(tab){
	  if (!tab || tab.length == 0){
	    return null;
	  }
	  return _.map(tab, function(value){
	    return this[value];
	  }, this);
  }
});
