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

    var inspector = req.query.inspector || null;
    var page = req.query.page || 1;

    search(query, inspector, page, HTML_SIZE).then(function(results) {
      res.render("reports.html", {
        results: results,
        query: req.query.query,
        inspector: inspector,
        page: page,
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
    }
    else
      query = "*";

    var inspector = req.query.inspector || null;
    var page = req.query.page || 1;

    search(query, inspector, page, XML_SIZE).then(function(results) {
      res.type("atom");
      res.render("reports.xml.ejs", {
        results: results,
        query: req.query.query,
        inspector: inspector,
        page: page,
        size: XML_SIZE,
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

      search("*", req.params.inspector, 1, HTML_SIZE).then(function(results) {
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

function search(query, inspector, page, size) {
  var from = (page - 1) * size;
  var body = {
    "from": from,
    "size": size,
    "query": {
      "filtered": {
        "query": {
          "query_string": {
            "query": query,
            "default_operator": "AND",
            "use_dis_max": true,
            "fields": ["text", "title", "summary",
                       "pdf.title", "pdf.keywords",
                       "doc.title",
                       "docx.title", "docx.keywords"]
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

  if (inspector) {
    body.query.filtered.filter = {
      "term": {
        "inspector": inspector
      }
    };
  }

  return es.search({
    index: config.elasticsearch.index_read,
    type: 'reports',
    body: body
  });
}
