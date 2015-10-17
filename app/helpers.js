// view helpers

var qs = require("querystring");
var numeral = require("numeral");

module.exports = {

  q: function(object) {
    return qs.stringify(object);
  },

  escape_attribute: function(text) {
    return text.replace(/\"/g, "&quot;");
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
  }

};
