"use strict";

// view helpers

var qs = require("querystring");
var numeral = require("numeral");
var es = require("./boot").es;
var config = require("../config/config");


/**********************************************************************
  Helper setup code - initializes on app boot.
***********************************************************************/

var inspector_list = require("../config/inspectors");
var inspectorMetadata = {};
for (var i = 0; i < inspector_list.length; i++) {
  var obj = inspector_list[i];
  inspectorMetadata[obj.slug] = obj;
}

// Cache-bust the CSS based on app boot-time.
var boot_time = new Date().getTime();


// Regularly update the counts from the database, without doing a
// database lookup on every page load.

var counts = {
  reports: null,
  inspectors: null
};

function updateReportCounts() {
  es.count({
    index: config.elasticsearch.index_read,
    type: "reports"
  }).then(function(result) {
    counts.reports = result.count;
  }, function(err) {
    console.log("Nooooo! " + err);
    counts.reports = null;
  });

  es.search({
    index: config.elasticsearch.index_read,
    type: "reports",
    searchType: "count",
    body: {
      aggregations: {
        inspector_agg: {
          terms: {
            field: "inspector",
            size: 0
          }
        }
      }
    }
  }).then(function(result) {
    var buckets = result.aggregations.inspector_agg.buckets;
    counts.inspectors = {};
    for (var i = 0; i < buckets.length; i++) {
      counts.inspectors[buckets[i].key] = buckets[i].doc_count;
    }
  }, function(err) {
    console.log("Nooooo! " + err);
    counts.inspectors = null;
  });
}

setInterval(updateReportCounts, 1000 * 60 * 60);
updateReportCounts();





/**********************************************************************
  Helpers available to local templates. Some use numbers calculated
  at boot, or from repeated background functions initialized at boot.
***********************************************************************/

module.exports = {

  q: function(object) {
    return qs.stringify(object);
  },

  format_number: function(val, default_string) {
    if (val === null || isNaN(val) || val === undefined) {
      return default_string;
    }
    try {
      return numeral(val).format("0,0");
    } catch (e) {
      return default_string;
    }
  },

  inspector_info: function(slug) {
    if (slug in inspectorMetadata) {
      return inspectorMetadata[slug];
    } else {
      return null;
    }
  },

  join_and: function(list) {
    if (list.length === 0) {
      return "";
    } else if (list.length == 1) {
      return list[0];
    } else if (list.length == 2) {
      return [list[0], " and ", list[1]].join("");
    } else {
      return [list.slice(0, -1).join(", "), ", and ", list[list.length - 1]].join("");
    }
  },

  // Remove form feed characters from a string
  strip_ff: function(string) {
    return string.replace(/\x0c/g, '');
  },

  // Return app boot time, useful cache-buster for assets.
  boot_time: boot_time,

  // Return latest cached report count data.
  counts: counts,

  // Return cached inspector metadata,
  inspector_list: inspector_list

};
