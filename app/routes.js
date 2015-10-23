// boilerplate includes
var config = require("../config/config"),
    helpers = require("./helpers"),
    elasticsearch = require("elasticsearch"),
    es = new elasticsearch.Client({
      host: config.elasticsearch,
      log: 'debug'
    });


module.exports = {

  // The homepage. A temporary search page.
  index: function(req, res) {
    res.render("index.html", {
      reportCount: reportCount
    });
  },

  // search/results
  reports: function(req, res) {
    var query;
    if (req.query.query) {
      query = req.query.query;
      if (query.charAt(0) != "\"" || query.charAt(query.length-1) != "\"")
        query = "\"" + query + "\"";
    }
    else
      query = "*";

    var inspector = req.query.inspector || null;
    var page = req.query.page || 1;

    search(query, inspector, page).then(function(results) {
      res.render("reports.html", {
        reportCount: reportCount,
        results: results,
        query: req.query.query,
        inspector: inspector,
        page: page
      });
    }, function(err) {
      console.log("Noooo!");
      res.status(500);
      res.render("reports.html", {
        reportCount: reportCount,
        results: null,
        query: null
      });
    });
  },

  inspectors: function(req, res) {
    res.render("inspectors.html", {
      reportCount: reportCount,
      inspectorReportCounts: inspectorReportCounts
    });
  },

  inspector: function(req, res) {
    var metadata = helpers.inspector_info(req.params.inspector);
    if (metadata) {
      var inspectorReportCount;
      if (inspectorReportCounts) {
        inspectorReportCount = inspectorReportCounts[req.params.inspector] || 0;
      } else {
        inspectorReportCount = null;
      }
      search("*", req.params.inspector, 1).then(function(results) {
        res.render("inspector.html", {
          reportCount: reportCount,
          inspector: req.params.inspector,
          metadata: metadata,
          inspectorReportCount: inspectorReportCount,
          results: results
        });
      }, function(err) {
        console.log("Noooo!");
        res.render("inspector.html", {
          reportCount: reportCount,
          inspector: req.params.inspector,
          metadata: metadata,
          results: []
        });
      });
    } else {
      res.status(404);
      res.render("inspector.html", {
        reportCount: reportCount,
        metadata: null
      });
    }
  },

  report: function(req, res) {
    get(req.params.inspector, req.params.report_id).then(function(result) {
      res.render("report.html", {
        reportCount: reportCount,
        report: result._source
      });
    }, function(err) {
      console.log("Nooooo! " + err);
      res.status(500);
      res.render("report.html", {
        reportCount: reportCount,
        report: null
      });
    });
  }

};

function get(inspector, report_id) {
  return es.get({
    index: 'oversight',
    type: 'reports',
    id: inspector + '-' + report_id
  });
}

function search(query, inspector, page) {
  var size = 10;
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

  if (inspector) {
    body.query.filtered.filter = {
      "term": {
        "inspector": inspector
      }
    };
  }

  return es.search({
    index: 'oversight',
    type: 'reports',
    body: body
  });
}

var reportCount = null;
var inspectorReportCounts = null;

function updateReportCounts() {
  es.count({
    index: "oversight",
    type: "reports"
  }).then(function(result) {
    reportCount = result.count;
  }, function(err) {
    console.log("Nooooo! " + err);
    reportCount = null;
  });
  es.search({
    index: "oversight",
    type: "reports",
    searchType: "count",
    body: {
      aggregations: {
        inspector_agg: {
          terms: {
            field: "inspector",
            size: 0
          }
        }
      }
    }
  }).then(function(result) {
    var buckets = result.aggregations.inspector_agg.buckets;
    inspectorReportCounts = {};
    for (var i = 0; i < buckets.length; i++) {
      inspectorReportCounts[buckets[i].key] = buckets[i].doc_count;
    }
  }, function(err) {
    console.log("Nooooo! " + err);
    inspectorReportCounts = null;
  });
}

setInterval(updateReportCounts, 1000 * 60 * 60);
updateReportCounts();
