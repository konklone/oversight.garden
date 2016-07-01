"use strict";

var test = require('tape');
var fs = require('fs');
var request = require('request');

var server = require('./server');
var config = require('../config/config');

test('upload dashboard data', function(t) {
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
    t.ifError(error);
    t.equal(200, response.statusCode);
    t.end();
  });
});

test('unauthenticated dashboard upload fails', function(t) {
  var url = server.getBaseURL() + "/dashboard/upload";
  var options = {
    url: url,
    method: "PUT",
    body: fs.readFileSync("test/data_sample/dashboard.json"),
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  };
  request(options, function(error, response, body) {
    t.ifError(error);
    t.equal(403, response.statusCode);
    t.end();
  });
});

test('dashboard renders without error', function(t) {
  var baseURL = server.getBaseURL();
  request(baseURL + '/dashboard', function(error, response, body) {
    t.ifError(error);
    t.equal(200, response.statusCode);
    t.end();
  });
});
