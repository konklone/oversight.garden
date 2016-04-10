"use strict";

// boilerplate includes
var config = require("../config/config"),
    es = require("./boot").es,
    helpers = require("./helpers"),
    fs = require("fs");

// Number of reports per request for web page results and RSS results
var HTML_SIZE = 10;
var XML_SIZE = 50;

module.exports = function(app) {

  // The homepage. A temporary search page.
  app.get('/', function(req, res) {
    res.render("index.html", {
      inspector: null
    });
  });

  app.get('/about', function(req, res) {
    res.redirect(302, 'https://sunlightfoundation.com/blog/2014/11/07/opengov-voices-opening-up-government-reports-through-teamwork-and-open-data/');
  });

  app.get('/reports', function(req, res) {
    var query;
    if (req.query.query)
      query = req.query.query;
    else
      query = "*";

    var featured = (req.query.featured == "true");

    var inspector = req.query.inspector || null;
    var page = req.query.page || 1;

    search(query, {
      inspector: inspector,
      page: page,
      featured: featured,
      size: HTML_SIZE
    }).then(function(results) {
      res.render("reports.html", {
        results: results,
        query: req.query.query,
        inspector: inspector,
        page: page,
        featured: featured,
        size: HTML_SIZE
      });
    }, function(err) {
      console.log("Noooo!\n\n" + err);

      res.status(500);
      res.render("reports.html", {
        results: null,
        query: null,
        inspector: inspector,
        page: null
      });
    });
  });

  app.get('/reports.xml', function(req, res) {
    var query;
    if (req.query.query) {
      query = req.query.query;
      if (query.charAt(0) != "\"" || query.charAt(query.length-1) != "\"")
        query = "\"" + query + "\"";
    }
    else
      query = "*";

    var featured = (req.query.featured == "true");

    var inspector = req.query.inspector || null;
    var page = req.query.page || 1;

    search(query, {
      inspector: inspector,
      page: page,
      size: XML_SIZE,
      featured: featured
    }).then(function(results) {
      res.type("atom");
      res.render("reports.xml.ejs", {
        results: results,
        query: req.query.query,
        inspector: inspector,
        page: page,
        size: XML_SIZE,
        featured: featured,
        self_url: req.url
      });
    }, function(err) {
      console.log("Noooo!\n\n" + err);

      res.status(500);
      res.type("text");
      res.send("Server error");
    });
  });


  app.get('/inspectors', function(req, res) {
    res.render("inspectors.html");
  });

  app.get('/inspectors/:inspector', function(req, res) {
    var metadata = helpers.inspector_info(req.params.inspector);

    if (metadata) {
      var inspectorReportCount = null;
      if (helpers.counts.inspectors)
        inspectorReportCount = helpers.counts.inspectors[req.params.inspector] || 0;

      search("*", {
        inspector: req.params.inspector,
        page: 1,
        size: HTML_SIZE
      }).then(function(results) {
        res.render("inspector.html", {
          inspector: req.params.inspector,
          metadata: metadata,
          inspectorReportCount: inspectorReportCount,
          results: results
        });
      }, function(err) {
        console.log("Noooo!\n\n" + err);
        res.render("inspector.html", {
          inspector: req.params.inspector,
          metadata: metadata,
          inspectorReportCount: inspectorReportCount,
          results: []
        });
      });

    } else {
      res.status(404);
      res.render("inspector.html", {metadata: null});
    }
  });

  app.get('/reports/:inspector/:report_id', function(req, res) {
    get(req.params.inspector, req.params.report_id).then(function(result) {
      res.render("report.html", {
        report: result._source
      });
    }, function(err) {
      console.log("Nooooo!\n\n" + err);
      res.status(500);
      res.render("report.html", {report: null});
    });
  });

};


function get(inspector, report_id) {
  return es.get({
    index: config.elasticsearch.index_read,
    type: 'reports',
    id: inspector + '-' + report_id
  });
}

function search(query, options) {
  if (!options) options = {};

  // defaults
  options.inspector = options.inspector || null;
  options.page = options.page || 1;
  options.size = options.size || HTML_SIZE;
  options.featured = options.featured || false;

  var from = (options.page - 1) * options.size;

  var body = {
    "from": from,
    "size": options.size,
    "query": {
      "filtered": {
        "query": {
          "query_string": {
            "query": query,
            "default_operator": "AND",
            "use_dis_max": true,
            "fields": ["text", "title", "summary"]
          }
        }
      }
    },
    "sort": [{
      "published_on": "desc"
    }],
    "highlight": {
      "encoder": "html",
      "pre_tags": ["<b>"],
      "post_tags": ["</b>"],
      "fields": {
        "*": {}
      },
      "order": "score",
      "fragment_size": 500
    },
    "_source": ["report_id", "year", "inspector", "agency", "title", "agency_name", "url", "landing_url", "inspector_url", "published_on", "type", "file_type"]
  };

  if (options.inspector) {
    body.query.filtered.filter = {
      "term": {
        "inspector": options.inspector
      }
    };
  }

  if (options.featured) {
    body.query.filtered.filter = {
      "term": {
        "is_featured": true
      }
    };
  }

  if (options.inspector && options.featured) {
    body.query.filtered.filter = {
      "bool": {
        "must": [
          {
            "term": {
              "inspector": options.inspector
            }
          },
          {
            "term": {
              "is_featured": true
            }
          }
        ]
      }
    };
  }

  return es.search({
    index: config.elasticsearch.index_read,
    type: 'reports',
    body: body
  });
}
