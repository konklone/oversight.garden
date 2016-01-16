
var config = require("../config/config"),
    elasticsearch = require("elasticsearch");

module.exports = {
  es: new elasticsearch.Client({
    host: {
      host: config.elasticsearch.host,
      port: config.elasticsearch.port
    },
    log: 'debug'
  })
}