// boilerplate includes
var config = require("../config/config"),
    elasticsearch = require("elasticsearch"),
    es = new elasticsearch.Client({
      host: config.elasticsearch,
      log: 'debug'
    });


module.exports = {

  // The homepage. A temporary search page.
  index: function(req, res) {
    res.render("index.html", {});
  },

  // search/results
  reports: function(req, res) {
    var query;
    if (req.param("query")) {
      query = req.param("query");
      if (query.charAt(0) != "\"" || query.charAt(query.length-1) != "\"")
        query = "\"" + query + "\"";
    }
    else
      query = "*";

    var page = req.param("page") || 1;

    search(query, page).then(function(results) {
      res.render("reports.html", {
        results: results,
        query: req.param("query"),
        page: page
      });
    }, function(err) {
      console.log("Noooo!");
      res.render("reports.html", {
        results: null,
        query: null
      });
    })
  },

  report: function(req, res) {
    get(req.param("report_id")).then(function(result) {
      res.render("report.html", {
        report: result._source
      });
    }, function(err) {
      console.log("Nooooo! " + err);
      res.render("report.html", {
        report: null
      });
    })
  }

};

function get(id) {
  return es.get({
    index: 'oversight',
    type: 'reports',
    id: id
  });
}

function search(query, page) {
  var size = 10;
  var from = (page - 1) * size;
  return es.search({
    index: 'oversight',
    type: 'reports',
    body: {
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
        "fields": {
          "*": {}
        },
        "order": "score",
        "fragment_size": 500
      },
      "_source": ["report_id", "year", "inspector", "agency", "title", "agency_name", "url", "landing_url", "inspector_url", "published_on", "type", "file_type"]
    }
  });
}