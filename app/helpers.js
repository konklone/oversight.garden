// view helpers

var qs = require("querystring");
var numeral = require("numeral");

var inspectorMetadataList = require("../config/inspectors");
var inspectorMetadata = {};
for (var i = 0; i < inspectorMetadataList.length; i++) {
  var obj = inspectorMetadataList[i];
  inspectorMetadata[obj.slug] = obj;
}


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

  inspector_list: inspectorMetadataList,

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

};
