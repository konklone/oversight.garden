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
    res.render("index.html", {});
  });

  app.get('/about', function(req, res) {
    res.redirect(302, 'https://sunlightfoundation.com/blog/2014/11/07/opengov-voices-opening-up-government-reports-through-teamwork-and-open-data/');
  });

  app.get('/reports', function(req, res) {
    var query_obj = parse_search_query(req.query, HTML_SIZE);

    search(query_obj).then(function(results) {
      res.render("reports.html", {
        results: results,
        query_obj: query_obj,
      });
    }, function(err) {
      console.log("Noooo!\n\n" + err);

      res.status(500);
      res.render("reports.html", {
        results: null,
        query_obj: {},
      });
    });
  });

  app.get('/reports/featured', function(req, res) {
    var query_obj = parse_search_query(req.query, HTML_SIZE);
    query_obj.featured = true;

    search(query_obj).then(function(results) {
      res.render("reports.html", {
        results: results,
        query_obj: query_obj,
      });
    }, function(err) {
      console.log("Noooo!\n\n" + err);

      res.status(500);
      res.render("reports.html", {
        results: null,
        query_obj: {},
      });
    });
  });

  app.get('/reports/unreleased', function(req, res) {
    var query_obj = parse_search_query(req.query, HTML_SIZE);
    query_obj.unreleased = true;

    search(query_obj).then(function(results) {
      res.render("reports.html", {
        results: results,
        query_obj: query_obj,
      });
    }, function(err) {
      console.log("Noooo!\n\n" + err);

      res.status(500);
      res.render("reports.html", {
        results: null,
        query_obj: {},
      });
    });
  });

  app.get('/reports.xml', function(req, res) {
    var query_obj = parse_search_query(req.query, XML_SIZE);

    search(query_obj).then(function(results) {
      res.type("atom");
      res.render("reports.xml.ejs", {
        results: results,
        query_obj: query_obj,
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

      var query_obj = {
        query: "*",
        inspector: [req.params.inspector],
        page: 1,
        featured: false,
        unreleased: false,
        foiad: false,
        size: HTML_SIZE
      };
      search(query_obj).then(function(results) {
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

/* Parses query string parameters from a search request, and returns an object
 * that can be passed to the search function.
 */
function parse_search_query(request_query, size) {
  var search_query;
  if (request_query.query)
    search_query = request_query.query;
  else
    search_query = "*";

  var original_search_query = request_query.query || "";

  var inspector;
  if (request_query.inspector) {
    if (Array.isArray(request_query.inspector)) {
      inspector = request_query.inspector;
    } else {
      inspector = [request_query.inspector];
    }
  } else {
    inspector = null;
  }

  var page = parseInt(request_query.page);
  if (!Number.isInteger(page)) {
    page = 1;
  }

  var featured = (request_query.featured == "true");
  var unreleased = (request_query.unreleased == "true");
  var foiad = (request_query.foiad == "true");

  return {
    query: search_query,
    original_query: original_search_query,
    inspector: inspector,
    page: page,
    size: size,
    featured: featured,
    unreleased: unreleased,
    foiad: foiad
  };
}

function get(inspector, report_id) {
  return es.get({
    index: config.elasticsearch.index_read,
    type: 'reports',
    id: inspector + '-' + report_id
  });
}

function search(query_obj) {
  var from = (query_obj.page - 1) * query_obj.size;
  var body = {
    "from": from,
    "size": query_obj.size,
    "query": {
      "filtered": {
        "query": {
          "query_string": {
            "query": query_obj.query,
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
    "_source": ["report_id", "year", "inspector", "agency", "title", "agency_name", "url", "landing_url", "inspector_url", "published_on", "type", "file_type", "featured.author", "featured.author_link", "featured.description", "unreleased", "missing"]
  };

  var filters = [];
  if (query_obj.inspector) {
    if (query_obj.inspector.length == 1) {
      filters.push({
        "term": {
          "inspector": query_obj.inspector[0]
        }
      });
    } else if (query_obj.inspector.length > 1) {
      filters.push({
        "terms": {
          "inspector": query_obj.inspector,
          "execution": "or"
        }
      });
    }
  }

  if (query_obj.featured) {
    filters.push({
      "term": {
        "is_featured": true
      }
    });
  }

  if (query_obj.unreleased) {
    filters.push({
      "term": {
        "unreleased": true
      }
    });
  }

  if (query_obj.foiad) {
    filters.push({
      "term": {
        "type": "FOIA - GovernmentAttic.org"
      }
    });
  }

  if (filters.length == 1) {
    body.query.filtered.filter = filters[0];
  } else if (filters.length > 1) {
    body.query.filtered.filter = {
      "bool": {
        "must": filters
      }
    };
  }

  return es.search({
    index: config.elasticsearch.index_read,
    type: 'reports',
    body: body
  });
}
