"use strict";

var config = require("../config/config"),
    AWS = require("aws-sdk"),
    elasticsearch = require("elasticsearch"),
    fs = require("fs"),
    yaml = require('js-yaml');

var esConfig = {
  apiVersion: "1.7",
  host: {
    host: config.elasticsearch.host,
    port: config.elasticsearch.port
  },
  // log: 'debug'
};

if (config.aws && config.elasticsearch.host != "127.0.0.1") {
  esConfig.connectionClass = require('http-aws-es');
  esConfig.amazonES = {
    region: config.aws.region,
    credentials: new AWS.EC2MetadataCredentials()
  };
}

module.exports = {
  es: new elasticsearch.Client(esConfig)
};

