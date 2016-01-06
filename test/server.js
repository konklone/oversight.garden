var app = require("../app").app;
var http = require("http");
var server;
var baseURL;

before(function(done) {
  server = http.createServer(app);
  server.on("listening", function() {
    var address_tmp = server.address();
    baseURL = "http://" + address_tmp.address + ":" + address_tmp.port;
    done();
  });
  server.listen(0, "127.0.0.1");
});

after(function(done) {
  server.close(done);
});

exports.getBaseURL = function() {
  return baseURL;
}
