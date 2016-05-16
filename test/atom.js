"use strict";

var assert = require('assert');
var request = require('request');

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
});
