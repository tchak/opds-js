#
# Module containing the whole OPDS parsing library
#
OPDS =

  Support: {}

  #
  # Convinience call to Feed.parseUrl
	# @see Feed.parseUrl
	# @return (see Feed.parseUrl)
  #
  access: (feed, callback) ->
    return OPDS.Feed.parseUrl feed, callback
