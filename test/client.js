"use strict";

var test = require('tape');
var webdriverio = require('webdriverio');
var options = {
  desiredCapabilities: {
    "browserName": "phantomjs",
    "phantomjs.page.customHeaders.Connection": "close"
  }
};
var client = webdriverio.remote(options);

test('start client', function(t) {
  client.init().then(function(result) {
    t.end();
  }, function(error) {
    t.end(error);
  });
});

test.onFinish(function() {
  client.end();
});

exports.client = client;
