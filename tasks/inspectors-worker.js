#!/usr/bin/env node

"use strict";

var AWS = require("aws-sdk"),
    elasticsearch = require("elasticsearch"),
    fs = require('fs'),
    path = require('path'),
    yaml = require('js-yaml');

var featured_path = "config/featured.yaml";
var featured = yaml.safeLoad(fs.readFileSync(featured_path));

// load a report from disk, put it into elasticsearch
function loadReport(details, config, done) {
  var base_path = details.base_path,
      inspector = details.inspector,
      year = details.year,
      report_id = details.report_id;
  console.log("[" + inspector + "][" + year + "][" + report_id + "]");

  console.log("\tLoading JSON from disk...");
  var datafile = path.join(base_path, inspector, year.toString(), report_id, "report.json");
  if (!fs.existsSync(datafile)) {
    console.error("ERROR: JSON missing, report is probably a bad URL.");
    return done();
  }
  var json = fs.readFileSync(datafile);
  if (!json || json.length <= 0) return done(null);
  var data = JSON.parse(json);

  console.log("\tLoading text from disk...");
  var textfile = path.join(base_path, inspector, year.toString(), report_id, "report.txt");
  if (fs.existsSync(textfile))
    data.text = fs.readFileSync(textfile).toString();

  // and this is for IG reports
  data.source = "igs";

  // if it's been manually flagged as featured, mark it as such
  if (featured[inspector] && featured[inspector][report_id]) {
    data.featured = featured[inspector][report_id];
    data.is_featured = true;
  } else
    data.is_featured = false;

  // Actually load into Elasticsearch
  console.log("\tIndexing into Elasticsearch...");
  var esConfig = {
    apiVersion: "5.0",
    host: {
      host: config.elasticsearch.host,
      port: config.elasticsearch.port
    }
  };
  if (config.aws && config.elasticsearch.host != "127.0.0.1") {
    esConfig.connectionClass = require('http-aws-es');
    esConfig.amazonES = {
      region: config.aws.region,
      credentials: new AWS.EC2MetadataCredentials()
    };
  }

  var es = new elasticsearch.Client(esConfig);
  es.index({
    index: config.elasticsearch.index_write,
    type: 'reports',
    id: inspector + '-' + report_id,
    body: data
  }, function(err) {
    if (err) {
      done(err);
    } else {
      done(null);
    }
  });
}

module.exports = loadReport;
