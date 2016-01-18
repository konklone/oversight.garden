"use strict";

var assert = require('assert');
var request = require('request');

var server = require('./server');

describe('homepage', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL, function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('reports page, all', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('reports page, search results', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports?query=audit', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('reports ATOM feed, all', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('reports ATOM feed, search results', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml?query=audit', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('inspectors page', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/inspectors', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('inspector page', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/inspector/denali', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});

describe('report page', function() {
  it('is OK', function(done) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/report/denali/DCOIG-15-013-M', function(error, response, body) {
      assert.ifError(error);
      assert.equal(response.statusCode, 200);
      done();
    });
  });
});
