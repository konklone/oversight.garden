/**
 * Load data from unitedstates/inspectors-general into Elasticsearch.
 *
 * Iterates over the IG data folder, one level at a time.
 * Defaults to all available agencies, all available years,
 * and all available reports in that year.
 *
 * Supported options:
 *   since: limit to all since a given year. defaults to current year.
 *   inspectors: limit to list of inspector slugs (comma-separated)
 *   report_id: limit to individual report ID (combine with --since if needed)
 *   limit: cut off after N reports, useful for debugging
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    glob = require('glob');

var config = require("../config/config"),
    elasticsearch = require("elasticsearch"),
    es = new elasticsearch.Client({
      host: config.elasticsearch,
      // log: 'trace'
    });

function run(options) {
  var limit = options.limit ? parseInt(options.limit) : null;
  var this_year = new Date().getYear() + 1900;
  var since = options.since ? parseInt(options.since) : this_year;
  var only_id = options.report_id;
  var inspectors = options.inspectors ? options.inspectors.split(",") : null;

  console.log("Loading all reports since " + since + ".");
  if (inspectors) console.log("Limiting to: " + inspectors);

  var fetch = [];
  var count = 0;
  // iterate over each agency
  glob.sync(path.join(config.inspectors.data, "*")).forEach(function(inspector_dir) {
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
          inspector: inspector,
          year: year,
          report_id: report_id
        });

        count += 1;
      });
    });
  });

  // load a report from disk, put it into elasticsearch
  function loadReport(details, done) {
    var inspector = details.inspector,
        year = details.year,
        report_id = details.report_id;
    console.log("[" + inspector + "][" + year + "][" + report_id + "]");

    console.log("\tLoading JSON from disk...")
    var datafile = path.join(config.inspectors.data, inspector, year.toString(), report_id, "report.json");
    var data = JSON.parse(fs.readFileSync(datafile));

    console.log("\tLoading text from disk...")
    var textfile = path.join(config.inspectors.data, inspector, year.toString(), report_id, "report.txt");
    if (fs.existsSync(textfile))
      data.text = fs.readFileSync(textfile).toString();

    // and this is for IG reports
    data.source = "igs";

    // Actually load into Elasticsearch
    console.log("\tIndexing into Elasticsearch...");
    es.index({
      index: 'oversight',
      type: 'reports',
      id: report_id,
      body: data
    }, function(err) {
      if (err) {
        console.log("\tEr what!!");
        console.log("\t" + err);
        process.exit(1);
      }

      done();
    });
  }

  async.eachSeries(fetch, loadReport, function(err) {
    if (err) console.log("Error doing things!!");

    console.log("All done.")
    process.exit(0);
  });
}

run(require('minimist')(process.argv.slice(2)));