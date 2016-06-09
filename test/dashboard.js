"use strict";

var assert = require('assert');
var fs = require('fs');
var request = require('request');

var server = require('./server');
var config = require('../config/config');

before(function(done) {
  var url = server.getBaseURL() + "/dashboard/upload";
  var qs = {"secret": config.dashboard.secret};
  var options = {
    url: url,
    method: "PUT",
    qs: qs,
    body: fs.readFileSync("test/data_sample/dashboard.json"),
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  };
  request(options, function(error, response, body) {
    assert.ifError(error);
    assert.equal(200, response.statusCode);
    done();
  });
});

describe('dashboard renders without error', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/dashboard', function(error, response, body) {
      assert.ifError(error);
      assert.equal(200, response.statusCode);
      done();
    });
  });
});
