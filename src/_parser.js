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
