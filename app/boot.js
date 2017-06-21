"use strict";

var config = require("../config/config"),
    AWS = require("aws-sdk"),
    elasticsearch = require("elasticsearch"),
    fs = require("fs"),
    yaml = require('js-yaml');

var esConfig = {
  apiVersion: "5.0",
  host: {
    host: config.elasticsearch.host,
    port: config.elasticsearch.port
  },
  // log: 'debug'
};

if (config.aws && config.elasticsearch.host != "127.0.0.1") {
  AWS.config.update({
    region: config.aws.region
  });
  esConfig.connectionClass = require('http-aws-es');
}

module.exports = {
  es: new elasticsearch.Client(esConfig)
};

