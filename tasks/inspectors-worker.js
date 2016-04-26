#!/usr/bin/env node

"use strict";

var fs = require('fs'),
    path = require('path');

var config = require("../config/config"),
    boot = require("../app/boot"),
    es = boot.es,
    featured = boot.featured;

// load a report from disk, put it into elasticsearch
function loadReport(details, done) {
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
