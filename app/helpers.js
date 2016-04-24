"use strict";

// view helpers

var querystring = require("querystring");
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
    return querystring.stringify(object);
  },

  format_qs: function(obj1, obj2) {
    obj2 = obj2 || {};
    var output_obj = {};

    var page = (obj2.page !== undefined) ? obj2.page : obj1.page;
    if (page != 1) {
      output_obj.page = page;
    }

    var original_query = (obj2.original_query !== undefined) ? obj2.original_query : obj1.original_query;
    if (original_query.length > 0) {
      output_obj.query = original_query;
    }

    var inspector = (obj2.inspector !== undefined) ? obj2.inspector : obj1.inspector;
    if (inspector && inspector.length > 0) {
      output_obj.inspector = inspector;
    }

    var featured = (obj2.featured !== undefined) ? obj2.featured : obj1.featured;
    if (featured) {
      output_obj.featured = featured;
    }

    var unreleased = (obj2.unreleased !== undefined) ? obj2.unreleased : obj1.unreleased;
    if (unreleased) {
      output_obj.unreleased = unreleased;
    }

    var foiad = (obj2.foiad !== undefined) ? obj2.foiad : obj1.foiad;
    if (foiad) {
      output_obj.foiad = foiad;
    }

    return querystring.stringify(output_obj);
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
