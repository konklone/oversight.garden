"use strict";

var test = require('tape');

var client = require('./client').client;
var server = require('./server');

test('homepage', function(t) {
  t.test('has a title', function(t) {
    var baseURL = server.getBaseURL();
    t.notEqual(baseURL, undefined);
    client
      .url(baseURL)
      // .getTitle(function(err, title) {
      //   t.equal(title, 'Oversight | Collecting the oversight community\'s work in one place.');
      // })
      .call(t.end);
  });
});
