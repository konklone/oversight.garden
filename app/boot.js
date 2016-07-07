"use strict";

var config = require("../config/config"),
    AWS = require("aws-sdk"),
    elasticsearch = require("elasticsearch"),
    fs = require("fs"),
    yaml = require('js-yaml');

var credentials = null;
var esConfig = {
  apiVersion: "1.7",
  host: {
    host: config.elasticsearch.host,
    port: config.elasticsearch.port
  },
  // log: 'debug'
};

if (config.aws) {
  esConfig.connectionClass = require('http-aws-es');
  credentials = new AWS.EC2MetadataCredentials();
  esConfig.amazonES = {
    region: config.aws.region,
    credentials: credentials
  };
}

module.exports = {
  es: new elasticsearch.Client(esConfig),
  refreshCredentials: function(callback) {
    if (credentials) {
      credentials.refresh(callback);
    } else {
      callback();
    }
  }
};

