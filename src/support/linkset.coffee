#
# A link is actually an array composed as :
# [rel, url , title, mimetype, opds:price, opds:currency]
#
class OPDS.Support.Link
  constructor: (array, browser) ->
	  @browser = browser || new OPDS.Support.Browser();
	  if @browser.currentLocation
		  array[1] = URI.join(@browser.currentLocation, array[1]).str()
		#
		# @return [String] link rel
		#
		@rel = array[0]
		#
		# @return [String] link url
		#
		@url = array[1]
		#
		# @return [String] link title
		#
		@title = array[2]
		#
		# @return [String] link type
		#
		@type = array[3]
		#
		# @return [String] link price
		#
		@price = array[4]
		#
		# @return [String] link currency
		#
		@currency = array[5]

  #
  # Will go parsing the resource at this url.
	# Proxy to Feed.parseUrl
	# @see Feed.parseUrl
	# @return (see Feed.parseUrl)
  #
  navigate: (callback) ->
	  OPDS.Feed.parseUrl @url, callback, @browser

#
# Set of links.
#
# It provides ways to query and filter the set
#
class OPDS.Support.LinkSet
  #
  # @param browser (see Feed.parseUrl) 
  #
  constructor: (browser) ->
	  @browser = browser || new OPDS.Support.Browser()
	  @length = 0
		@store =
		  rel: {}
		  txt: {}
		  link: {}
		  type: {}

  @extract: (element, expr) ->
    element.links = new OPDS.Support.LinkSet element.browser
    for linkElem in element.rawDoc.find(expr).toArray()
      text = null
      linkElem = $ linkElem

      text = linkElem.attr 'title'
      link = linkElem.attr 'href'
      type = linkElem.attr 'type'

      if linkElem.attr 'rel'
        for rel in linkElem.attr('rel').split()
          element.links.push rel, link, text, type
      else
        element.links.push null, link, text, type

  #
  # Add a link to the set 
	# @param key [String] rel value where to add the link
	# @param value [Array] remainder of link structure
  #
  set: (key, value) ->
	  link = new OPDS.Support.Link [key].concat(value), @browser
	  s = @store
    i = @length
		Array.prototype.push.apply @, [link]

		if not s.rel[key]
		  s.rel[key] = []
		s.rel[key].push i

		if not s.txt[value[1]]
		  s.txt[value[1]] = []
		s.txt[value[1]].push i

		if not s.link[_.first(value)]
		  s.link[_.first(value)] = []
		s.link[_.first(value)].push i

		if not s.type[_.last(value)]
		  s.type[_.last(value)] = []
		s.type[_.last(value)].push i

	get: (key) ->
    @remap @store.rel[key]

  #
  # Push a link to the set 
	# @param rel (see Link#rel)
	# @param link (see Link#url)
	# @param text (see Link#title)
	# @param price (see Link#price)
	# @param currency (see Link#currency)
  #
	push: (rel, link, text, type) ->
	  this.set rel, [link, text, type]

  #
  # Find first link url corresponding to the query
	# @example Query : 
	#    { 'rel': "related" }
	#
	linkUrl: (k) ->

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
