
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
		this.store = [];
		this.store.rel_store = {};
		this.store.txt_store = {};
		this.store.lnk_store = {};
		this.store.typ_store = {};
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
		s.push(link);
		var i = s.length - 1;
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

  each: function(callback){
	  _.each(this.store, callback);
	  return this;
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

	size: function(){
	  return this.store.length;
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
	  return _.first(this.store);
	},
			
  last: function(){
		return _.last(this.store);
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
	    return this.store[value];
	  }, this);
  }
});
