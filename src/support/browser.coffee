#
# Browser class, it will be used to access the Internet.
# Currently based on jQuery ajax and provide IE8/9 cross domain request support
#
class OPDS.Support.Browser
  #
  # Navigate to the provided uri
	# @param uri [String] uri to go to
	# @param callback
  #
	goTo: (uri, callback) ->
		url = new URI(uri).str()
		browser = this
		@lastResponse = null
		@currentLocation = url
		try
		  jQuery.get url, (data, status, response) =>
		    @lastResponse = response
        callback.call @, @
		catch (e)
		  if jQuery.browser.msie and window.XDomainRequest
        var xdr = new XDomainRequest()
        xdr.open 'get', url
        xdr.onload = =>
          @lastResponse = @
          @lastResponse.status = 200
          callback.call @, @

        xdr.onerror = =>
          @lastResponse = @
          @lastResponse.status = -1
          callback.call @, @
        }
        xdr.send()
      else
        console.error "Your browser is unable to load crossdomain requests!"

  #
  # Last page load was ok ?
	# @return [boolean]
  #
	isOk: () ->
	  @status() == 200
  
  #
  # @return [integer] Last page load return code
  #
	status: () ->
    if this.lastResponse then this.lastResponse.status else null

  #
  # @return [String] Last page body
  #
	body: () ->
    if @lastResponse then @lastResponse.responseText else null

  #
  # Try to discover catalog links at the given url
	# @param [String] url to search
	# @return [OPDS.Support.LinkSet, false] discovered links
  #
	discover: (url, callback) ->
    @goTo url, (browser) ->
	    if browser.isOk()
        wrapper = {rawDoc: $(browser.body())}
  			OPDS.Support.LinkSet.extract wrapper, '[type="application/atom+xml;type=entry;profile=opds-catalog"], [type="application/atom+xml;profile=opds-catalog"]'
  			if wrapper.links.size() == 0
  			  callback.call browser, false
        else
          callback.call browser, wrapper.links
  		else
  		  callback.call browser, false
