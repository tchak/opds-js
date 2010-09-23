
// // //
//  Link
//
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

// // //
//  LinkSet
//
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
