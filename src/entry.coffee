/**
 * Represents a catalog entry
 */
class OPDS.Entry
  /**
   * @param browser (see Feed.parseUrl)
   */
	constructor: function(browser){
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
    return this
