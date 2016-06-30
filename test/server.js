"use strict";

global.isTest = true;
var test = require('tape');
var app = require("../app").app;
var http = require("http");
var server;
var baseURL;

test('start server', function(t) {
  server = http.createServer(app);
  server.on("listening", function() {
    var address_tmp = server.address();
    baseURL = "http://" + address_tmp.address + ":" + address_tmp.port;
    t.end();
  });
  server.listen(0, "127.0.0.1");
});

test.onFinish(function() {
  server.close();
});

exports.getBaseURL = function() {
  return baseURL;
};
