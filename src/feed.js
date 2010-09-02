
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
            var disco = browser.discover(browser.currentLocation);
            if (disco.size > 0) {
              var d = disco[nil]
              // d||=disco['related']
              // d||=disco
              // console.log("Discovered : #{d.first.url}")
              // _.first(d).navigate();
            }
            callback.call(browser, false);
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
