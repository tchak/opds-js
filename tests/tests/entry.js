module("OPDS.Entry");

test("request entry", function() {
  AjaxSpy.start();
  stop();
  
  OPDS.Feed.parseUrl('/entry.atom', function(entry){
    ok(entry);
    ok(entry instanceof OPDS.Entry)
    start();
  });
  
  equals(AjaxSpy.requests.length, 1, "one request should have been made");

  var request = AjaxSpy.requests.shift();
  
  equals(request.type, "GET");
  equals(request.url, "/entry.atom");
});

test("get informations form entry", function() {
  stop();
  OPDS.Feed.parseUrl('/entry.atom', function(entry){
    equals(entry.title, "War and Peace");
    same(entry.author, {name:"Lev Nikolayevich Tolstoy",uri:"http://www.feedbooks.com/author/28",email:""});
    equals(entry.id, "http://www.feedbooks.com/book/83");

    ok(entry.links)
    equals(entry.links.length, 13);
    start();
  });
});

test("get acquisitionLinks from entry", function() {
  stop();
  OPDS.Feed.parseUrl('/entry.atom', function(entry){
    var acquisitionLinks = entry.acquisitionLinks();
    ok(acquisitionLinks);
    equals(acquisitionLinks.length, 3);
    ok(acquisitionLinks[0].rel.match(/^http:\/\/opds-spec\.org\/acquisition/));
    ok(acquisitionLinks[1].rel.match(/^http:\/\/opds-spec\.org\/acquisition/));
    ok(acquisitionLinks[2].rel.match(/^http:\/\/opds-spec\.org\/acquisition/));
    start();
  });
});

test("full entry", function() {
  stop();
  OPDS.Feed.parseUrl('/entry.atom', function(entry){
    ok(!entry.isPartial());
    start();
  });
});
