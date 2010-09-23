//= require <jquery>
//= require <underscore>
//= require <classy>
//= require <URI>

var OPDS = {
  Support: {},
  access: function(feed, callback){
    return OPDS.Feed.parseUrl(feed, callback);
  }
};


OPDS.Parser = Class.$extend({
	initialize: function(opts){
		this.sniffedType = null;
		this.options = _.extend({}, opts);
	},

	parse: function(content, browser){
	  var ret = this.__parseXML(content);
		this.sniffedType = this.__sniff(ret);
		switch (this.sniffedType){
		case 'acquisition': return new OPDS.AcquisitionFeed.fromJQuery(ret, browser);
		case 'navigation': return new OPDS.NavigationFeed.fromJQuery(ret, browser);
		case 'entry': return new OPDS.Entry.fromJQuery(ret, browser);
		default: return null;
		}
	},

  __parseXML: function(responseText){
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

	__sniff: function(doc){
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

OPDS.Support.Browser = Class.$extend({
	goTo: function(uri, callback){
		var url = new URI(uri).str();
		var browser = this;
		this.lastResponse = null;
		this.currentLocation = url;
		if (jQuery.browser.msie && window.XDomainRequest) {
      var xdr = new XDomainRequest();
      xdr.open("get", url);
      xdr.onload = function(){
        browser.lastResponse = this;
        browser.lastResponse.status = 200;
        callback.apply(browser, [browser]);
      };
      xdr.send();
    } else {
		  $.get(url, function(data, status, response){
		    browser.lastResponse = response;
		    callback.apply(browser, [browser]);
		  });
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

OPDS.Support.Link = Class.$extend({
  __init__: function(array, browser){
	  this.browser = browser || new OPDS.Support.Browser();
	  if (this.browser.currentLocation){
		  array[1] = URI.join(this.browser.currentLocation, array[1]).str();
		}
		this.rel = array[0] || null;
		this.url = array[1] || null;
		this.title = array[2] || null;
		this.type = array[3] || null;
		this.price = array[4] || null;
		this.currency = array[5] || null;
	},

  navigate: function(callback){
	  return OPDS.Feed.parseUrl(this.url, callback, this.browser);
	},

  inspect: function(){
  }
});

OPDS.Support.LinkSet = Class.$extend({
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
    return this.__remap(this.store.rel[key]);
	},

	push: function(rel, link, text, type){
	  this.set(rel, [link, text, type]);
	},

	linkUrl: function(k){
  },

	linkRel: function(k){
	},

	linkText: function(k){
	},

	linkType: function(k){
	},

  by: function(type){
    var hash = {};
    _.each(this.store[type], function(value, key){
      return hash[key] = this.__remap(value);
    }, this);
    return hash;
  },

	links: function(){
		return _.keys(this.store.link);
	},

	rels: function(){
		return _.keys(this.store.rel);
	},

	texts: function(){
		return _.keys(this.store.txt);
	},

	inspect: function(){

	},

	first: function(){
	  return _.first(this);
	},

  last: function(){
		return _.last(this);
	},

	__remap: function(tab){
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
     * @param callback [Function]
     * @param browser (see Feed.parseRaw)
     * @param parserOpts parser options (unused at the moment)
     * @see OPDS::Support::Browser
     * @return [AcquisitionFeed, NavigationFeed, Entry, null] an instance of a parsed feed, entry or null
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
    this.id = this.rawDoc.find('feed>id').text();
    /**
      @return [String] Feed icon definition
     */
    this.icon = this.rawDoc.find('feed>icon').text();
    /**
      @return [String] Feed title
     */
    this.title = this.rawDoc.find('feed>title').text();
    this.author = {
      name: this.rawDoc.find('feed>author>name').text(),
      uri: this.rawDoc.find('feed>author>uri').text(),
      email: this.rawDoc.find('feed>author>email').text()
    };
    this.entries = _(this.rawDoc.find('feed>entry')).chain().toArray().map(function(el){
      return OPDS.Entry.fromJQuery($(el), this.browser);
    }, this).value();
    OPDS.Support.LinkSet.extract(this, 'feed>link');
  },

  nextPageUrl: function(){
  },

  prevPageUrl: function(){
  },

  isPaginated: function(){
  },

  isFirstPage: function(){
    return this.isPaginated() ? !this.prevPageUrl() : false;
  },

  isLastPage: function(){
    return this.isPaginated() ? !this.nextPageUrl() : false;
  },

  nextPage: function(){
    return Feed.parseUrl(this.nextPageUrl(), this.browser);
  },

  prevPage: function(){
    return Feed.parseUrl(this.prevPageUrl(), this.browser);
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
   * @return [OPDS::Support::LinkSet] found links
   */
  navigationLinks: function(){

  }
});

/**
 * Represents an acquisition feed
 * @see http://opds-spec.org/specs/opds-catalog-1-0-20100830/#Acquisition_Feeds
 */
OPDS.AcquisitionFeed = OPDS.Feed.$extend({});

OPDS.Entry = Class.$extend({
	__init__: function(browser){
		this.browser = browser || new OPDS.Support.Browser();
		this.rawDoc = null;
	},

	__classvars__: {
		fromJQuery: function(content, browser){
		  var z = new OPDS.Entry(browser);
		  z.rawDoc = content;
			z.serialize();
			return z;
		}
	},

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
    OPDS.Support.LinkSet.extract(this, 'link');
    this.categories = this.rawDoc.find('category').map(function(i, n){
      return [$(n).attr('label'), $(n).attr('term')];
    });
    this.dcmetas = {};
  },

  acquisitionLinks: function(){
    var relStart = /^http:\/\/opds-spec.org\/acquisition/;
    return _(this.links.by('rel')).chain().reject(function(l, key){
      return !key.match(relStart);
    }).flatten().value();
	},

	isPartial: function(){
		return _.any(this.links.by('rel')['alternate'], function(l){
			return l.type == 'application/atom+xml' || l.type == 'application/atom+xml;type=entry';
		});
	},

  completeLink: function(){
    if (this.isPartial()){
		  return _.detect(this.links.by('rel')['alternate'], function(l){
			  return l.type == 'application/atom+xml;type=entry' || l.type == 'application/atom+xml';
		  });
		}
		return null;
  },

	completeUrl: function(){
	  if (this.completeLink()){
	    return this.completeLink().url;
		}
		return null;
	},

	complete: function(callback){
    if (this.completeLink()){
      return this.completeLink().navigate(callback);
    }
    return null;
  },

  inspect: function(){

	}
});
