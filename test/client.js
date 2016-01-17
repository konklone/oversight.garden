"use strict";

var webdriverio = require('webdriverio');
var options = {
  desiredCapabilities: {
    browserName: 'phantomjs'
  }
};
var client = webdriverio.remote(options);

before(function(done) {
  client.init(done);
});

after(function(done) {
  client.end(done);
});

exports.client = client;
