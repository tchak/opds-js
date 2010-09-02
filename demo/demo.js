$(function(){
  //var catalog = OPDS.access('./samples/navigation.txt');
  OPDS.access('http://www.feedbooks.com/catalog.atom', function(catalog){
    console.log(catalog)
    console.log(catalog.title);
    console.log(catalog.links.size());
    catalog.links.each(function(link){
      console.log(link.rel);
      if (link.rel == 'http://opds-spec.org/sort/new'){
        console.log('=====================');
        link.navigate(function(feed){
          console.log(feed.title);
          _.each(feed.entries, function(entry){
            console.log(entry.title);
            //console.log(entry.isPartial());
          });
          _.first(feed.entries).complete(function(entry){
            console.log(entry.title);
            console.log(entry.summary);
            console.log(entry.acquisitionLinks().length);
          });
        });
        console.log('=====================');
      }
    });
  });
});
