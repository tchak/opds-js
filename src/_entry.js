
// // //
// Entry
//
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
