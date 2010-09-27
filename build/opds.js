//= require <jquery>
//= require <underscore>
//= require <classy>
//= require <URI>

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

/**
 * Class in charge of discovering the type of the given text stream.
 * It will dispatch the pre-parsed atom content to the desired class
 * @see OPDS.AcquisitionFeed
 * @see OPDS.NavigationFeed
 * @see OPDS.Entry
 */
OPDS.Parser = Class.$extend({
	initialize: function(opts){
		this.sniffedType = null;
		this.options = _.extend({}, opts);
	},

  /**
   * Parse a text stream
	 * @param content [String] text stream
	 * @param browser (see Feed.parseUrl)
	 * @return [NavigationFeed, AcquisitionFeed, Entry] the parsed structure
	 */
	parse: function(content, browser){
	  var ret = this.parseXML(content);
		this.sniffedType = this.sniff(ret);
		switch (this.sniffedType){
		case 'acquisition': return new OPDS.AcquisitionFeed.fromJQuery(ret, browser);
		case 'navigation': return new OPDS.NavigationFeed.fromJQuery(ret, browser);
		case 'entry': return new OPDS.Entry.fromJQuery(ret, browser);
		default: return null;
		}
	},

  parseXML: function(responseText){
    if (window.ActiveXObject) {
      doc = new ActiveXObject('Microsoft.XMLDOM');
      doc.async = 'false';
      doc.loadXML(responseText);
    } else {
      var parser = new DOMParser();
      doc = parser.parseFromString(responseText, 'text/xml');
    }
    return $(doc);
  },

  /**
   * Sniff a provided nokogiri document to detect it's type
	 * @param doc [jQuery Object] Document to sniff
	 * @return ['acquisition', 'navigation', 'entry', nil] sniffed type
	 */
	sniff: function(doc){
	  var element = doc[0];
	  if (element && element.documentElement && $.nodeName(element.documentElement, 'entry')){
		  return 'entry';
		} else {
			var entries = doc.find('feed>entry');
			if (entries.length > 0){
			  if (_(entries).chain().toArray().all(function(entry){
					return _($(entry).find('link')).chain().toArray().any(function(link){
					  var l = $(link).attr('rel');
					  return _.isString(l) ? l.match(/http:\/\/opds-spec.org\/acquisition/) : false;
					}).value();
				}).value()) {
				  return 'acquisition';
				}
				return 'navigation';
			}
			return null;
		}
	}
});
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
/**
 * Feed class is used as an ancestor to NavigationFeed and AcquisitionFeed it handles
 * all the parsing
 * @abstract Not really abstract as it's full fledged, but it should not be used directly
 */
OPDS.Feed = Class.$extend({
  __init__: function(browser){
    this.browser = browser || new OPDS.Support.Browser();
    this.rawDoc = null;
  },

  __classvars__: {
    /**
     * Parse the given url.
     *
     * If the resource at the give url is not an OPDS Catalog, this method will
     * try to find a linked catalog.
     * If many are available it will take the first one with a priority given to
     * null rel or rel="related" catalogs.
     *
     * @param url [String] url to parse
     * @param callback [Function] called with [AcquisitionFeed, NavigationFeed, Entry, null] an instance of a parsed feed, entry or null
     * @param browser (see Feed.parseRaw)
     * @param parserOpts parser options (unused at the moment)
     * @see OPDS::Support::Browser
     * @return [OPDS.Feed] self
     */
    parseUrl: function(url, callback, browser, parserOpts){
      var browser = browser || new OPDS.Support.Browser();
      var self = this;
      browser.goTo(url, function(browser){
        if (browser.isOk()) {
          var parsed = self.parseRaw(browser.body(), parserOpts, browser);
          if (parsed == null) {
            var disco = browser.discover(browser.currentLocation, function(){
              if (disco.size > 0) {
                var d = disco.get('related');
                if (d && d.length > 0){
                  _.first(d).navigate(callback);
                }
              }
              callback.call(browser, false);
            });
          } else {
            callback.call(browser, parsed);
          }
        } else {
          callback.call(browser, false);
        }
      });
      return this;
    },
    /**
     * Will parse a text stream as an OPDS Catalog, internaly used by #parseUrl
     *
     * @param txt [String] text to parse
     * @param opts [Hash] options to pass to the parser
     * @param browser [OPDS.Support.Browser] an optional compatible browser to use
     * @return [AcquisitionFeed, NavigationFeed] an instance of a parsed feed or null
     */
    parseRaw: function(txt, opts, browser){
      var parser = new OPDS.Parser(opts);
      return parser.parse(txt, browser);
    },

    fromJQuery: function(content, browser){
      var z = new OPDS.Feed(browser);
      z.rawDoc = content;
      z.serialize();
      return z;
    }
  },

  /**
   * @private
   * read xml entries into the entry list struct
   */
  serialize: function(){
    /**
     * @return [String] Feed id
     */
    this.id = this.rawDoc.find('feed>id').text();
    /**
     * @return [String] Feed icon definition
     */
    this.icon = this.rawDoc.find('feed>icon').text();
    /**
     * @return [String] Feed title
     */
    this.title = this.rawDoc.find('feed>title').text();
    /**
     * @return [Hash] Feed author (keys : name,uri,email)
     */
    this.author = {
      name: this.rawDoc.find('feed>author>name').text(),
      uri: this.rawDoc.find('feed>author>uri').text(),
      email: this.rawDoc.find('feed>author>email').text()
    };
    /**
     * Entry list
 		 * @see Entry
 		 * @return [Array<Entry>] list of parsed entries
 		 */
    this.entries = _(this.rawDoc.find('feed>entry')).chain().toArray().map(function(el){
      return OPDS.Entry.fromJQuery($(el), this.browser);
    }, this).value();
    /**
     * @return [OPDS.Support.LinkSet] Set with atom feed level links
		 */
    OPDS.Support.LinkSet.extract(this, 'feed>link');
  },

  /**
   * @return [String] Next page url
   */
  nextPageUrl: function(){
  },

  /**
   * @return [String] Previous page url
   */
  prevPageUrl: function(){
  },

  /**
   * Is the feed paginated ?
	 * @return Boolean
   */
  isPaginated: function(){
  },

  /**
   * Is it the first page ?
	 * @return Boolean
	 */
  isFirstPage: function(){
    return this.isPaginated() ? !this.prevPageUrl() : false;
  },

  /**
   * Is it the last page ?
	 * @return Boolean
	 */
  isLastPage: function(){
    return this.isPaginated() ? !this.nextPageUrl() : false;
  },

  /**
   * Get next page feed
   * @param callback [Function]
	 * @return (see Feed.parseUrl)
	 */
  nextPage: function(callback){
    Feed.parseUrl(this.nextPageUrl(), callback, this.browser);
    return this;
  },

  /**
   * Get previous page feed
   * @param callback [Function]
	 * @return (see Feed.parseUrl)
	 */
  prevPage: function(callback){
    Feed.parseUrl(this.prevPageUrl(), callback, this.browser);
    return this;
  },

  inspect: function(){
  }
});

/**
 * Represents a navigation feed
 * @see http://opds-spec.org/specs/opds-catalog-1-0-20100830/#Navigation_Feeds
 */
OPDS.NavigationFeed = OPDS.Feed.$extend({
  /**
   * Collection of all Navigation feeds found in this feed
   * @return [OPDS.Support.LinkSet] found links
   */
  navigationLinks: function(){

  },

  __classvars__: {
    fromJQuery: function(content, browser){
      var z = new OPDS.NavigationFeed(browser);
      z.rawDoc = content;
      z.serialize();
      return z;
    }
  }
});

/**
 * Represents an acquisition feed
 * @see http://opds-spec.org/specs/opds-catalog-1-0-20100830/#Acquisition_Feeds
 */
OPDS.AcquisitionFeed = OPDS.Feed.$extend({
  __classvars__: {
    fromJQuery: function(content, browser){
      var z = new OPDS.AcquisitionFeed(browser);
      z.rawDoc = content;
      z.serialize();
      return z;
    }
  }
});
/**
 * Represents a catalog entry
 */
OPDS.Entry = Class.$extend({
  /**
   * @param browser (see Feed.parseUrl)
   */
	__init__: function(browser){
		this.browser = browser || new OPDS.Support.Browser();
		/**
		 * "Raw" jQuery document used while parsing.
		 * It might useful to access atom foreign markup
		 * @return [jQuery Object] Parsed document
		 */
		this.rawDoc = null;
		/**
		 * @return [String] entry title
		 */
		this.title = null;
		/**
		 * @return [String] entry id
		 */
		this.id = null;
		/**
		 * @return [String] entry summary
		 */
		this.summary = null;
		/**
		 * @return [String] entry content
		 */
    this.content = null;
    /**
		 * @return [String] entry rights
		 */
    this.rights = null;
    /**
		 * @return [String] entry subtitle
		 */
    this.subtitle = null;
		/**
		 * @return [String] entry updated date
		 */
 		this.updated = null;
 		/**
 		 * @return [String] entry published date
 		 */
 		this.published = null;
    /**
 		 * @return [Array] entry parsed authors
 		 */
 		this.authors = [];
 		/**
     * First Author
		 * @return [Hash]
		 */
		this.author = null;
 		/**
 		 * @return [Array] entry parsed contributors
 		 */
    this.contributors = [];
    /**
     * @return [Array] Categories found
     */
    this.categories = [];
    /**
     * @return [OPDS.Support.LinkSet] Set of links found in the entry
     */
    this.links = OPDS.Support.LinkSet(browser);
    /**
     * @return [Hash] Hash of found dublin core metadata found in the entry
		 * @see http://dublincore.org/documents/dcmi-terms/
		 */
    this.dcmetas = {};
	},

	__classvars__: {
	  /**
	   * Create an entry from a jquery object
 		 * @param content [jQuery Object] jQuery object (should be <entry>)
 		 * @param browser (see Feed.parseUrl)
 		 * @return [Entry]
 		 */
		fromJQuery: function(content, browser){
		  var z = new OPDS.Entry(browser);
		  z.rawDoc = content;
			z.serialize();
			return z;
		}
	},

  /**
   * Read the provided document into the entry struct
	 * @private
	 */
	serialize: function(){
		if (this.rawDoc.find('entry').length == 1){
		  this.rawDoc = this.rawDoc.find('entry');
		}
		this.title = this.rawDoc.find('title').text() || null;
		this.id = this.rawDoc.find('id').text() || null;
		this.summary = this.rawDoc.find('summary').text() || null;
    this.content = this.rawDoc.find('content').text() || null;
    this.rights = this.rawDoc.find('rights').text() || null;
    this.subtitle = this.rawDoc.find('subtitle').text() || null;
		var d = this.rawDoc.find('updated').text();
		try {
		  this.updated = Date.parse(d);
		} catch (e) {
		  this.updated = null;
		}
		d = this.rawDoc.find('published').text();
		try {
		  this.published = Date.parse(d);
		} catch (e) {
		  this.published = null;
		}
    this.authors = _(this.rawDoc.find('author')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('author>name', auth).text(),
       uri: this.rawDoc.find('author>uri', auth).text(),
       email: this.rawDoc.find('author>email', auth).text()
     };
    }, this).value();
		this.author =  _.first(this.authors);
    this.contributors = _(this.rawDoc.find('contributor')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('contributor>name', auth).text(),
       uri: this.rawDoc.find('contributor>uri', auth).text(),
       email: this.rawDoc.find('contributor>email', auth).text()
     };
    }, this).value();
    this.categories = this.rawDoc.find('category').map(function(i, n){
      return [$(n).attr('label'), $(n).attr('term')];
    });
    OPDS.Support.LinkSet.extract(this, 'link');
  },

  /**
   * @return [Array] acquisition link subset
   */
  acquisitionLinks: function(){
    var relStart = /^http:\/\/opds-spec.org\/acquisition/;
    return _(this.links.by('rel')).chain().reject(function(l, key){
      return !key.match(relStart);
    }).flatten().value();
	},

  /**
   * Is it a partial atom entry ?
	 * @return [boolean]
	 */
	isPartial: function(){
		return _.any(this.links.by('rel')['alternate'], function(l){
			return l.type == 'application/atom+xml' || l.type == 'application/atom+xml;type=entry';
		});
	},

  /**
   * @return [OPDS.Support.Link] link to the complete entry
	 */
  completeLink: function(){
    if (this.isPartial()){
		  return _.detect(this.links.by('rel')['alternate'], function(l){
			  return l.type == 'application/atom+xml;type=entry' || l.type == 'application/atom+xml';
		  });
		}
		return null;
  },

  /**
   * @return [String] URL to the complete entry
	 */
	completeUrl: function(){
	  if (this.completeLink()){
	    return this.completeLink().url;
		}
		return null;
	},

	/**
	 * @param callback [Function]
	 * @return [OPDS.Entry] self
	 */
	complete: function(callback){
    if (this.completeLink()){
      return this.completeLink().navigate(callback);
    }
    return this;
  },

  inspect: function(){

	}
});
