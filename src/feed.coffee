#
# Feed class is used as an ancestor to NavigationFeed and AcquisitionFeed it handles
# all the parsing
# @abstract Not really abstract as it's full fledged, but it should not be used directly
#
class OPDS.Feed
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

#
# Represents a navigation feed 
# @see http://opds-spec.org/specs/opds-catalog-1-0-20100830/#Navigation_Feeds
#
class OPDS.NavigationFeed extends OPDS.Feed
  #
  # Collection of all Navigation feeds found in this feed
  # @return [OPDS.Support.LinkSet] found links
  #
  navigationLinks: ->
  
  @fromJQuery: (content, browser) ->
    z = new OPDS.NavigationFeed browser
    z.rawDoc = content
    z.serialize()

#
# Represents an acquisition feed
# @see http://opds-spec.org/specs/opds-catalog-1-0-20100830/#Acquisition_Feeds
#
class OPDS.AcquisitionFeed extends OPDS.Feed

  @fromJQuery: (content, browser) ->
    z = new OPDS.AcquisitionFeed browser
    z.rawDoc = content
    z.serialize()
