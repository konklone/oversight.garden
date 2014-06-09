var config = require("./config"),
    elasticsearch = require("elasticsearch"),
    es = new elasticsearch.Client({
      host: config.elasticsearch,
      log: 'debug'
    });

module.exports = {

  // todo: https://github.com/vol4ok/hogan-express

  index: function(req, res) {
    search().then(function(results) {
      res.render("index.html", {results: results.hits.hits})
    }, function(err) {
      console.log("Noooo!");
      res.render("index.html", {results: null});
    })
  }

};

function search(query) {
  return es.search({
    index: 'oversight',
    type: 'ig_reports',
    body: {
      query: {
        match_all: {}
      }
    }
  });
}