"use strict";

var test = require('tape');
var request = require('request');

var server = require('./server');

test('homepage', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL, function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports page, all', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports page, search results', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports?query=audit', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports page, one inspector filter', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports?inspector=nasa', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports page, two inspector filter', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports?inspector=nasa&inspector=nsa', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports page, double query string', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports?page=18&query=&inspector=education?page=18&query=&inspector=education', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('featured reports page', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports/featured', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('unreleased reports page', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports/unreleased', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports ATOM feed, all', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports ATOM feed, search results', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml?query=audit', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports ATOM feed, one inspector filter', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml?inspector=nasa', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports ATOM feed, two inspector filter', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml?inspector=nasa&inspector=nsa', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('reports ATOM feed, double query string', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports.xml?page=18&query=&inspector=education?page=18&query=&inspector=education', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('inspectors page', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/inspectors', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('inspector page', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/inspectors/denali', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});

test('report page', function(t) {
  t.test('is OK', function(t) {
    var baseURL = server.getBaseURL();
    request(baseURL + '/reports/denali/DCOIG-15-013-M', function(error, response, body) {
      t.ifError(error);
      t.equal(200, response.statusCode);
      t.end();
    });
  });
});
