module("OPDS.NavigationFeed");

test("request navigation feed", function() {
  AjaxSpy.start();
  stop();
  
  OPDS.Feed.parseUrl('/navigation.atom', function(catalog){
    ok(catalog);
    ok(catalog instanceof OPDS.NavigationFeed)
    start();
  });
  
  equals(AjaxSpy.requests.length, 1, "one request should have been made");

  var request = AjaxSpy.requests.shift();
  
  equals(request.type, "GET");
  equals(request.url, "/navigation.atom");
});

test("get informations form navigation feed", function() {
  stop();
  OPDS.Feed.parseUrl('/navigation.atom', function(catalog){
    equals(catalog.title, "Feedbooks | OPDS Catalog");
    same(catalog.author, {name:"Feedbooks",uri:"http://www.feedbooks.com",email:"support@feedbooks.com"});
    equals(catalog.icon, "http://www.feedbooks.com/favicon.ico");
    equals(catalog.id, "http://www.feedbooks.com/catalog.atom");

    ok(catalog.entries)
    equals(catalog.entries.length, 3);

    ok(catalog.links)
    equals(catalog.links.length, 10);
    start();
  });
});
