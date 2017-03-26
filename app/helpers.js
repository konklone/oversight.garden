"use strict";

// view helpers

var querystring = require("querystring");
var numeral = require("numeral");
var moment = require("moment");
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
    body: {
      size: 0,
      aggregations: {
        inspector_agg: {
          terms: {
            field: "inspector"
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

setInterval(updateReportCounts, 1000 * 60 * 60).unref();
updateReportCounts();



var date_regex = /([0-9]{4})-(0[0-9]|1[0-2])-([0-9]{1,2})/;
var months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"];


/**********************************************************************
  Helpers available to local templates. Some use numbers calculated
  at boot, or from repeated background functions initialized at boot.
***********************************************************************/

module.exports = {

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

    var published_on_start = (obj2.published_on_start !== undefined) ? obj2.published_on_start : obj1.published_on_start;
    if (published_on_start) {
      output_obj.published_on_start = published_on_start;
    }

    var published_on_end = (obj2.published_on_end !== undefined) ? obj2.published_on_end : obj1.published_on_end;
    if (published_on_end) {
      output_obj.published_on_end = published_on_end;
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

  format_date: function(value) {
    var match = date_regex.exec(value);
    if (match) {
      var month = parseInt(match[2]);
      if (Number.isInteger(month) && month >= 1 && month <= 12) {
        return months[month - 1] + " " + match[3] + ", " + match[1];
      }
    }
    return value;
  },

  format_time_ago: function(timestamp) {
    return moment(timestamp).fromNow();
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
