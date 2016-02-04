"use strict";

var webdriverio = require('webdriverio');
var options = {
  desiredCapabilities: {
    browserName: 'phantomjs'
  }
};
var client = webdriverio.remote(options);

before(function(done) {
  client.init().then(function(result) {
    done();
  }, function(error) {
    done(error);
  });
});

after(function(done) {
  client.end().then(function(result) {
    done();
  }, function(error) {
    done(error);
  });
});

exports.client = client;
