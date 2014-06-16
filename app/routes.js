// boilerplate includes
var config = require("../config/config"),
    elasticsearch = require("elasticsearch"),
    es = new elasticsearch.Client({
      host: config.elasticsearch,
      log: 'trace'
    });


module.exports = {
  index: function(req, res) {

    search(req.param("query")).then(function(results) {
      res.render("index.html", {
        results: results.hits.hits,
        query: req.param("query")
      })
    }, function(err) {
      console.log("Noooo!");
      res.render("index.html", {
        results: null,
        query: null
      });
    })
  }

};

function search(query) {
  return es.search({
    index: 'oversight',
    type: 'ig_reports',
    body: {
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
        }
      },
      "_source": ["report_id", "year", "inspector", "agency", "title", "agency_name", "url", "landing_url", "inspector_url", "published_on", "type"]
    }
  });
}