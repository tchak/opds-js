/*
 * Copyright © 2007 Dominic Mitchell
 * Copyright © 2010 Paul Chavard
 * 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * Neither the name of the Dominic Mitchell nor the names of its contributors
 * may be used to endorse or promote products derived from this software
 * without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*
 * An URI datatype.  Based upon examples in RFC3986.
 *
 * TODO %-escaping
 * TODO split apart authority
 * TODO split apart query_string (on demand, anyway)
 * TODO handle parameters containing empty strings properly
 * TODO keyword escaping
 *
 */

// Introduce a new scope to define some private helper functions.
(function(){
  var root = this;
  //// HELPER FUNCTIONS /////
  
  // RFC3986 §5.2.3 (Merge Paths)
  function merge(base, rel_path) {
    var dirname = /^(.*)\//;
    if (base.authority && !base.path) {
      return "/" + rel_path;
    } else {
      return base.getPath().match(dirname)[0] + rel_path;
    }
  }
  
  // Match two path segments, where the second is ".." and the first must
  // not be "..".
  var DoubleDot = /\/((?!\.\.\/)[^\/]*)\/\.\.\//;
  
  function remove_dot_segments(path) {
    if (!path) {
      return "";
    }
    // Remove any single dots
    var newpath = path.replace(/\/\.\//g, '/');
    // Remove any trailing single dots.
    newpath = newpath.replace(/\/\.$/, '/');
    // Remove any double dots and the path previous.  NB: We can't use
    // the "g", modifier because we are changing the string that we're
    // matching over.
    while (newpath.match(DoubleDot)) {
      newpath = newpath.replace(DoubleDot, '/');
    }
    // Remove any trailing double dots.
    newpath = newpath.replace(/\/([^\/]*)\/\.\.$/, '/');
    // If there are any remaining double dot bits, then they're wrong
    // and must be nuked.  Again, we can't use the g modifier.
    while (newpath.match(/\/\.\.\//)) {
      newpath = newpath.replace(/\/\.\.\//, '/');
    }
    return newpath;
  }
  
  // TODO: Make these do something
  function uriEscape(source) {
    return source;
  }
  
  function uriUnescape(source) {
    return source;
  }

  //// URI CLASS /////
  
  // Constructor for the URI object.  Parse a string into its components.
  root.URI = _.Class({
    initialize: function(str){
      if (!str) {
          str = "";
      }
      // Based on the regex in RFC2396 Appendix B.
      var parser = /^(?:([^:\/?\#]+):)?(?:\/\/([^\/?\#]*))?([^?\#]*)(?:\?([^\#]*))?(?:\#(.*))?/;
      var result = str.match(parser);
      
      // Keep the results in private variables.
      this.__private__ = {
        scheme: result[1] || null,
        authority: result[2] || null,
        path: result[3] || null,
        query: result[4] || null,
        fragment: result[5] || null
      };
    },

    extend: {
      join: function(){
        var args = _.toArray(arguments);
        var uri = new URI(args.shift());
        _.each(args, function(path){
          uri.merge(new URI(path));
        });
        return uri;
      }
    },

    // Set up accessors.
    getScheme: function(){
      return this.__private__.scheme;
    },

    setScheme: function(newScheme){
      this.__private__.scheme = newScheme;
      return this;
    },

    getAuthority: function(){
      return this.__private__.authority;
    },

    setAuthority: function(newAuthority){
      this.__private__.authority = newAuthority;
      return this;
    },

    getPath: function(){
      return this.__private__.path;
    },

    setPath: function(newPath){
      this.__private__.path = newPath;
      return this;
    },

    getQuery: function(){
      return this.__private__.query;
    },

    setQuery: function(newQuery){
      this.__private__.query = newQuery;
      return this;
    },

    getFragment: function(){
      return this.__private__.fragment;
    },

    setFragment: function(newFragment){
      this.__private__.fragment = newFragment;
      return this;
    },

    merge: function(uri){
      if (uri.getScheme()){
        this.setScheme(uri.getScheme());
      }
      if (uri.getAuthority()){
        this.setAuthority(uri.getAuthority());
      }
      if (uri.getPath()){
        this.setPath(uri.getPath());
      }
      if (uri.getQuery()){
        this.setQuery(uri.getQuery());
      }
      if (uri.getFragment()){
        this.setFragment(uri.getFragment());
      }
      return this;
    },

    // Restore the URI to it's stringy glory.
    toString: function () {
      var str = "";
      if (this.getScheme()) {
          str += this.getScheme() + ":";
      }
      if (this.getAuthority()) {
          str += "//" + this.getAuthority();
      }
      if (this.getPath()) {
          str += this.getPath();
      }
      if (this.getQuery()) {
          str += "?" + this.getQuery();
      }
      if (this.getFragment()) {
          str += "#" + this.getFragment();
      }
      return str;
    },

    // RFC3986 §5.2.2. Transform References;
    resolve: function (base) {
      var target = new URI();
      if (this.getScheme()) {
        target.setScheme(this.getScheme());
        target.setAuthority(this.getAuthority());
        target.setPath(remove_dot_segments(this.getPath()));
        target.setQuery(this.getQuery());
      } else {
        if (this.getAuthority()) {
          target.setAuthority(this.getAuthority());
          target.setPath(remove_dot_segments(this.getPath()));
          target.setQuery(this.getQuery());
        } else {
          // XXX Original spec says "if defined and empty"…;
          if (!this.getPath()) {
            target.setPath(base.getPath());
            if (this.getQuery()) {
              target.setQuery(this.getQuery());
            } else {
              target.setQuery(base.getQuery());
            }
          } else {
            if (this.getPath().charAt(0) === '/') {
              target.setPath(remove_dot_segments(this.getPath()));
            } else {
              target.setPath(merge(base, this.getPath()));
              target.setPath(remove_dot_segments(target.getPath()));
            }
            target.setQuery(this.getQuery());
          }
          target.setAuthority(base.getAuthority());
        }
        target.setScheme(base.getScheme());
      }
      target.setFragment(this.getFragment());
      return target;
    },
  
    parseQuery: function () {
      return URIQuery.fromString(this.getQuery(), this.querySeparator);
    }
  });

  //// URIQuery CLASS /////
  
  root.URIQuery = _.Class({
    initialize: function(){
      this.params    = {};
      this.separator = "&";
    },

    extend: {
      fromString: function (sourceString, separator){
        var result = new URIQuery();
        if (separator) {
          result.separator = separator;
        }
        result.addStringParams(sourceString);
        return result;
      }
    },

    // From http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
    // (application/x-www-form-urlencoded).
    // 
    // NB: The user can get this.params and modify it directly.
    addStringParams: function(sourceString){
      var kvp = sourceString.split(this.separator);
      var list, key, value;
      _.each(kvp, function(val){
        list  = val.split("=", 2);
        key = uriUnescape(list[0].replace(/\+/g, " "));
        value = uriUnescape(list[1].replace(/\+/g, " "));
        if (!this.params.hasOwnProperty(key)) {
          this.params[key] = [];
        }
        this.params[key].push(value);
      });
      return this;
    },

    getParam: function(key){
      if (this.params.hasOwnProperty(key)) {
        return this.params[key][0];
      }
      return null;
    },

    toString: function(){
      var kvp = [];
      //var keys = hashkeys(this.params);
      var keys = _.keys(this.params).sort();
      _.each(keys, function(val){
        _.each(this.params[val], function(val2){
          kvp.push(val.replace(/ /g, "+") + "=" + val2.replace(/ /g, "+"));
        });
      }, this);
      // for (ik = 0; ik < keys.length; ik++) {
      //   for (ip = 0; ip < this.params[keys[ik]].length; ip++) {
      //     kvp.push(keys[ik].replace(/ /g, "+") + "=" + this.params[keys[ik]][ip].replace(/ /g, "+"));
      //   }
      // }
      return kvp.join(this.separator);
    }
  });
})();
