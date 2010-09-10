
// // //
// Entry
//
OPDS.Entry = _.Class({
	initialize: function(browser){
		this.browser = browser || new OPDS.Support.Browser();
		this.rawDoc = null;
	},

	extend: {
		fromJQuery: function(content, browser){
		  var z = new OPDS.Entry(browser);
		  z.rawDoc = content;
			z.serialize();
			return z;
		}
	},

	serialize: function(){
    // Get full entry element from document
		if (this.rawDoc.find('entry').length == 1){
		  this.rawDoc = this.rawDoc.find('entry');
		}
		// Title
		this.title = this.rawDoc.find('title').text() || null;
		// Id
		this.id = this.rawDoc.find('id').text() || null;
		// Summary
		this.summary = this.rawDoc.find('summary').text() || null;
		// Content
    this.content = this.rawDoc.find('content').text() || null;
    // Rights
    this.rights = this.rawDoc.find('rights').text() || null;
    // Subtitle
    this.subtitle = this.rawDoc.find('subtitle').text() || null;
		// Updated
		var d = this.rawDoc.find('updated').text();
		try {
		  this.updated = Date.parse(d);
		} catch (e) {
		  this.updated = null;
		}
		// Published
		d = this.rawDoc.find('published').text();
		try {
		  this.published = Date.parse(d);
		} catch (e) {
		  this.published = null;
		}
    // Authors
    this.authors = _(this.rawDoc.find('author')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('author>name', auth).text(),
       uri: this.rawDoc.find('author>uri', auth).text(),
       email: this.rawDoc.find('author>email', auth).text()
     };
    }, this).value();
    // Author
		this.author =  _.first(this.authors);
		// Contributors
    this.contributors = _(this.rawDoc.find('contributor')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('contributor>name', auth).text(),
       uri: this.rawDoc.find('contributor>uri', auth).text(),
       email: this.rawDoc.find('contributor>email', auth).text()
     };
    }, this).value();
    // Links
    OPDS.Support.LinkSet.extract(this, 'link');
    // Categories
    this.categories = this.rawDoc.find('category').map(function(i, n){
      return [$(n).attr('label'), $(n).attr('term')];
    });
    // DC Metas
    this.dcmetas = {};
    // dcmetas=Hash.new
    // prefs=@namespaces.reject{|_,v| !%W[http://purl.org/dc/terms/ http://purl.org/dc/elements/1.1/].include?v}
    // prefs.keys.map{|p| p.split(':').last}.each do |pref|
    //   raw_doc.xpath('./'+pref+':*',@namespaces).each do |n|
    //      @dcmetas[n.name]=[] unless  @dcmetas[n.name]
    //      @dcmetas[n.name].push [n.text, n]
    //    end
    //  end
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


// // //
// Parser
//
OPDS.Parser = _.Class({
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


// // //
// Browser
//
OPDS.Support.Browser = _.Class({
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


// // //
//  Link
//
OPDS.Support.Link = _.Class({
  initialize: function(array, browser){
	  this.browser = browser || new OPDS.Support.Browser();
	  if (this.browser.currentLocation){
		  array[1] = URI.join(this.browser.currentLocation, array[1]).toString();
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

// // //
//  LinkSet
//
OPDS.Support.LinkSet = _.Class({
  initialize: function(browser){
	  this.browser = browser || new OPDS.Support.Browser();
	  this.length = 0;
		this.store = {
		  rel_store: {},
		  txt_store: {},
		  lnk_store: {},
		  typ_store: {}
		};
	},

  extend: {
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
	  var s = this.store;
		var i = this.length;
		Array.prototype.push.apply(this, [link]);
		// Rels
		if (!s.rel_store[key]){
		  s.rel_store[key] = [];
		}
		s.rel_store[key].push(i);
		// Textes
		if (!s.txt_store[value[1]]){
		  s.txt_store[value[1]] = [];
		}
		s.txt_store[value[1]].push(i)
		// Links
		if (!s.lnk_store[_.first(value)]){
		  s.lnk_store[_.first(value)] = [];
		}
		s.lnk_store[_.first(value)].push(i);
		// Types
		if (!s.typ_store[_.last(value)]){
		  s.typ_store[_.last(value)] = [];
		}
		s.typ_store[_.last(value)].push(i)
	},

	get: function(key){
    return this.__remap(this.store.rel_store[key]);
	},

	push: function(rel, link, text, type){
	  this.set(rel, [link, text, type]);
	},

	linkUrl: function(k){
    // var ty,v=k.first
    // t=this.__remap(this.__collection(ty)[v])
    // t.first[1] unless t.nil?
  },
			
	linkRel: function(k){
    //    ty,v=k.first
    // t=this.__remap(this.__collection(ty)[v])
    // t.first[0] unless t.nil?
	},

	linkText: function(k){
    // ty,v=k.first
    // t=this.__remap(this.__collection(ty)[v])
    // t.first[2] unless t.nil?
	},
			
	linkType: function(k){
    // ty,v=k.first
    // t=this.__remap(this.__collection(ty)[v])
    // t.first[3] unless t.nil?
	},

  by: function(type){
    var hash = {};
    _.each(this.__collection(type), function(value, key){
      return hash[key] = this.__remap(value);
    }, this);
    return hash;
  },

	links: function(){
		return _.keys(this.store.lnk_store);
	},
			
	rels: function(){
		return _.keys(this.store.rel_store);
	},
			
	texts: function(){
		return _.keys(this.store.txt_store);
	},

	inspect: function(){
	  
	},

	first: function(){ 
	  return _.first(this);
	},
			
  last: function(){
		return _.last(this);
	},
 
	__collection: function(type){
		switch (type){
		case 'link': return this.store.lnk_store;
		case 'rel': return this.store.rel_store;
		case 'txt': return this.store.txt_store;
		case 'type': return this.store.typ_store;
	  }
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


// // //
// Feed
//
OPDS.Feed = _.Class({
  initialize: function(browser){
    this.browser = browser || new OPDS.Support.Browser();
    this.rawDoc = null;
  },
  
  extend: {
    parseUrl: function(url, callback, browser, opts){
      var browser = browser || new OPDS.Support.Browser();
      var self = this;
      browser.goTo(url, function(browser){
        if (browser.isOk()) {
          var parsed = self.parseRaw(browser.body(), opts, browser);
          if (parsed == null) {
            var disco = browser.discover(browser.currentLocation, function(){
              if (disco.size > 0) {
                var d = disco.get('related');
                if (d && d.length > 0){
                  //console.log("Discovered : #{d.first.url}")
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

  // read xml entries into entry struct
  serialize: function(){
    // Id
    this.id = this.rawDoc.find('feed>id').text();
    // Icon
    this.icon = this.rawDoc.find('feed>icon').text();
    // Title
    this.title = this.rawDoc.find('feed>title').text();
    // Author
    this.author = {
      name: this.rawDoc.find('feed>author>name').text(),
      uri: this.rawDoc.find('feed>author>uri').text(),
      email: this.rawDoc.find('feed>author>email').text()
    };
    // Entries
    this.entries = _(this.rawDoc.find('feed>entry')).chain().toArray().map(function(el){
      return OPDS.Entry.fromJQuery($(el), this.browser);
    }, this).value();
    // Links
    OPDS.Support.LinkSet.extract(this, 'feed>link');
  },

  nextPageUrl: function(){
    //return links.linkUrl('rel' => 'next');
  },

  prevPageUrl: function(){
    //return links.linkUrl('rel' => 'prev');
  },

  isPaginated: function(){
    //!next_page_url.nil?||!prev_page_url.nil?
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

// // //
// NavigationFeed
//
OPDS.NavigationFeed = _.Class(OPDS.Feed, {});

// // //
// AcquisitionFeed
//
OPDS.AcquisitionFeed = _.Class(OPDS.Feed, {});


// // //
// Entry
//
OPDS.Entry = _.Class({
	initialize: function(browser){
		this.browser = browser || new OPDS.Support.Browser();
		this.rawDoc = null;
	},

	extend: {
		fromJQuery: function(content, browser){
		  var z = new OPDS.Entry(browser);
		  z.rawDoc = content;
			z.serialize();
			return z;
		}
	},

	serialize: function(){
    // Get full entry element from document
		if (this.rawDoc.find('entry').length == 1){
		  this.rawDoc = this.rawDoc.find('entry');
		}
		// Title
		this.title = this.rawDoc.find('title').text() || null;
		// Id
		this.id = this.rawDoc.find('id').text() || null;
		// Summary
		this.summary = this.rawDoc.find('summary').text() || null;
		// Content
    this.content = this.rawDoc.find('content').text() || null;
    // Rights
    this.rights = this.rawDoc.find('rights').text() || null;
    // Subtitle
    this.subtitle = this.rawDoc.find('subtitle').text() || null;
		// Updated
		var d = this.rawDoc.find('updated').text();
		try {
		  this.updated = Date.parse(d);
		} catch (e) {
		  this.updated = null;
		}
		// Published
		d = this.rawDoc.find('published').text();
		try {
		  this.published = Date.parse(d);
		} catch (e) {
		  this.published = null;
		}
    // Authors
    this.authors = _(this.rawDoc.find('author')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('author>name', auth).text(),
       uri: this.rawDoc.find('author>uri', auth).text(),
       email: this.rawDoc.find('author>email', auth).text()
     };
    }, this).value();
    // Author
		this.author =  _.first(this.authors);
		// Contributors
    this.contributors = _(this.rawDoc.find('contributor')).chain().toArray().map(function(auth){
     return {
       name: this.rawDoc.find('contributor>name', auth).text(),
       uri: this.rawDoc.find('contributor>uri', auth).text(),
       email: this.rawDoc.find('contributor>email', auth).text()
     };
    }, this).value();
    // Links
    OPDS.Support.LinkSet.extract(this, 'link');
    // Categories
    this.categories = this.rawDoc.find('category').map(function(i, n){
      return [$(n).attr('label'), $(n).attr('term')];
    });
    // DC Metas
    this.dcmetas = {};
    // dcmetas=Hash.new
    // prefs=@namespaces.reject{|_,v| !%W[http://purl.org/dc/terms/ http://purl.org/dc/elements/1.1/].include?v}
    // prefs.keys.map{|p| p.split(':').last}.each do |pref|
    //   raw_doc.xpath('./'+pref+':*',@namespaces).each do |n|
    //      @dcmetas[n.name]=[] unless  @dcmetas[n.name]
    //      @dcmetas[n.name].push [n.text, n]
    //    end
    //  end
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
