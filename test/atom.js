"use strict";

var assert = require('assert');
var async = require('async');
var request = require('request');
var xmldom = require('xmldom');
var xpath = require('xpath');

var server = require('./server');

describe('reports ATOM feed', function() {
  var atomBody;

  before(function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml', function(error, response, body) {
      atomBody = body;
      done();
    });
  });

  it('doesn\'t contain original_query', function(done) {
    assert.equal(-1, atomBody.indexOf("original_query"));
    done();
  });

  it('has valid links', function(done) {
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
      assert.equal(1, results.length);
      var href = results[0].nodeValue;
      var patched_href = href.replace(new RegExp("^https://oversight.garden"),
                                      baseURL);
      request(patched_href, function(error, response, body) {
        assert.ifError(error);
        assert.equal(200, response.statusCode);
        done();
      });
    }, done);
  });
});
