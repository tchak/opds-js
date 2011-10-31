#
# Class in charge of discovering the type of the given text stream.
# It will dispatch the pre-parsed atom content to the desired class
# @see OPDS.AcquisitionFeed
# @see OPDS.NavigationFeed
# @see OPDS.Entry
#
class OPDS.Parser
	constructor: (opts) ->
		@sniffedType = null
		@options = _.extend {}, opts

  #
  # Parse a text stream
	# @param content [String] text stream
	# @param browser (see Feed.parseUrl)
	# @return [NavigationFeed, AcquisitionFeed, Entry] the parsed structure
  #
	parse: (content, browser) ->
	  ret = $.parseXML content
		@sniffedType = @sniff ret
		switch @sniffedType
		  when 'acquisition' then new OPDS.AcquisitionFeed.fromJQuery ret, browser
      when 'navigation' then new OPDS.NavigationFeed.fromJQuery ret, browser
      when 'entry' then new OPDS.Entry.fromJQuery ret, browser
      else null

  #
  # Sniff a provided nokogiri document to detect it's type 
	# @param doc [jQuery Object] Document to sniff
	# @return ['acquisition', 'navigation', 'entry', nil] sniffed type
	#
	sniff: (doc) ->
    element = doc[0];
	  if element && element.documentElement && $.nodeName(element.documentElement, 'entry')
		  'entry'
		else
			entries = doc.find 'feed > entry'
		  if entries.length > 0
        if entries.find('link rel[http://opds-spec.org/acquisition]').length > 0
          'acquisition'
        else
          'navigation'
      null
