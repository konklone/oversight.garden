"use strict";

var test = require('tape');
var async = require('async');
var request = require('request');
var xmldom = require('xmldom');
var xpath = require('xpath');

var server = require('./server');

test('reports ATOM feed', function(t) {
  var atomBody;

  t.test('fetch feed', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml', function(error, response, body) {
      atomBody = body;
      t.end();
    });
  });

  t.test('doesn\'t contain original_query', function(t) {
    t.equal(-1, atomBody.indexOf("original_query"));
    t.end();
  });

  t.test('has valid links', function(t) {
    var baseURL = server.getBaseURL();
    var select = xpath.useNamespaces({"atom": "http://www.w3.org/2005/Atom"});
    var parser = new xmldom.DOMParser();
    var doc = parser.parseFromString(atomBody, "text/xml");
    async.eachSeries(["atom:feed/atom:link[not(@rel)]/@href",
                      "atom:feed/atom:link[@rel='alternate']/@href",
                      "atom:feed/atom:link[@rel='self']/@href",
                      "atom:feed/atom:link[@rel='first']/@href",
                      "atom:feed/atom:link[@rel='last']/@href"
    ], function(expression, done) {
      var results = select(expression, doc);
      t.equal(1, results.length);
      var href = results[0].nodeValue;
      var patched_href = href.replace(new RegExp("^https://oversight.garden"),
                                      baseURL);
      request(patched_href, function(error, response, body) {
        t.ifError(error);
        t.equal(200, response.statusCode);
        done();
      });
    }, t.end);
  });

  t.end();
});
