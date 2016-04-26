#!/usr/bin/env node

"use strict";

/**
 * Load data from unitedstates/inspectors-general and unitedstates/reports
 * into Elasticsearch.
 *
 * Iterates over the IG data folders, one level at a time.
 * Defaults to all available agencies, all available years,
 * and all available reports in that year.
 */

var async = require('async'),
    fs = require('fs'),
    glob = require('glob'),
    path = require('path'),
    workerFarm = require('worker-farm');

var config = require("../config/config"),
    boot = require("../app/boot"),
    es = boot.es;

var farm = workerFarm({
  maxCallsPerWorker: 1000,
  maxConcurrentWorkers: 1,
  maxRetries: 20
}, require.resolve('./inspectors-worker'));

function loadReportProxy(details, done) {
  farm(details, config, function(err) {
    if (err) {
      console.log("\tEr what!!");
      console.log("\t" + err);
      process.exit(1);
    }

    done();
  });
}

function crawl(options, base_path) {
  var limit = options.limit ? parseInt(options.limit) : null;
  var this_year = new Date().getYear() + 1900;
  var since = options.since ? parseInt(options.since) : this_year;
  var only_id = options.report_id;
  var inspectors = options.inspectors ? options.inspectors.split(",") : null;

  console.log("Loading all reports since " + since + " from " + base_path + ".");
  if (inspectors) console.log("Limiting to: " + inspectors);

  var fetch = [];
  var count = 0;
  // iterate over each agency
  glob.sync(path.join(base_path, "*")).forEach(function(inspector_dir) {
    var inspector = path.basename(inspector_dir);

    // iterate over each year
    glob.sync(path.join(inspector_dir, "*")).forEach(function(year_dir) {
      var year = parseInt(path.basename(year_dir));

      // iterate over each report
      glob.sync(path.join(year_dir, "*")).forEach(function(report_dir) {
        var report_id = path.basename(report_dir);

        var should_skip = (
          (year < since) ||
          (inspectors && (inspectors.indexOf(inspector) < 0)) ||
          (only_id && (only_id != report_id)) ||
          (limit && (count >= limit))
        );
        if (should_skip) return;

        fetch.push({
          base_path: base_path,
          inspector: inspector,
          year: year,
          report_id: report_id
        });

        count += 1;
      });
    });
  });
  return fetch;
}

function ingest(fetch, done) {
  if (fetch.length === 0) {
    // Don't need to refresh index if there are no reports, exit early
    return done();
  }

  async.eachSeries(fetch, loadReportProxy, function(err) {
    if (err) console.log("Error doing things!!");

    done();
  });
}

function run(options) {
  var unknown_option = false;
  for (var option in options) {
    if (option != "since" &&
        option != "inspectors" &&
        option != "report_id" &&
        option != "limit" &&
        option != "_" &&
        option != "config") {
      unknown_option = option;
    }
  }
  if (unknown_option) {
    console.error("Unrecognized command line argument " + unknown_option);
    console.error("Supported options:");
    console.error("  since: limit to all since a given year, defaults to current year");
    console.error("  inspectors: limit to list of inspector slugs (comma-separated)");
    console.error("  report_id: limit to individual report ID (combine with --since if needed)");
    console.error("  limit: cut off after N reports, useful for debugging");
    console.error("  config: specify a different configuration file");
    process.exit(1);
  }

  var scraper_data_list = crawl(options, config.inspectors.data);
  ingest(scraper_data_list, function() {
    var reports_dir = config.reports && config.reports.data;
    var reports_list = [];
    if (reports_dir) {
      var reports_ig_dir = path.join(reports_dir, "inspectors-general");
      reports_list = crawl(options, reports_ig_dir);
    }
    ingest(reports_list, function() {
      workerFarm.end(farm);

      console.log("Refreshing index.");
      es.indices.refresh(function(err) {
        if (err) console.log("Error: " + err);

        console.log("All done.");
      });
    });
  });
}

run(require('minimist')(process.argv.slice(2)));
