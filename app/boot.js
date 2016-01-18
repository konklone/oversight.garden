"use strict";

var config = require("../config/config"),
    elasticsearch = require("elasticsearch");

module.exports = {
  es: new elasticsearch.Client({
    apiVersion: "1.7",
    host: {
      host: config.elasticsearch.host,
      port: config.elasticsearch.port
    },
    log: 'debug'
  })
};

