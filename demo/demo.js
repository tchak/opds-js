$(function(){
  OPDS.access('http://www.feedbooks.com/catalog.atom', function(catalog){
    $('#start').append('<h1>'+catalog.title+' ('+catalog.links.length+')</h1>');
    _.each(catalog.links, function(link){
      if (link.rel == 'http://opds-spec.org/sort/new'){
        link.navigate(function(feed){
          $('#start').append('<hr/>');
          $('#start').append('<h3>'+feed.title+'</h3>');
          _.first(feed.entries).complete(function(entry){
            $('#start').append('<hr/>');
            $('#start').append('<h4>'+entry.title+' ('+entry.acquisitionLinks().length+')</h4>');
            $('#start').append('<div>'+entry.summary+'</div>');
          });
          $('#start').append('<ul></ul>');
          _.each(feed.entries, function(entry){
            $('#start ul').append('<li>'+entry.title+'</li>');
          });
        });
      }
    });
  });
});
