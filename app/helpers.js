// view helpers

var qs = require("querystring");
var numeral = require("numeral");

module.exports = {

  truncate: function(text, limit) {
    if (text.length > limit)
      return text.substr(0, limit);
    else
      return text;
  },

  q: function(object) {
    return qs.stringify(object);
  },

  escape_attribute: function(text) {
    return text.replace(/\"/g, "&quot;");
  },

  format_number: function(val, default_string) {
    if (val === null || val === NaN || val === undefined) {
      return default_string;
    }
    try {
      return numeral(val).format("0,0");
    } catch (e) {
      return default_string;
    }
  }

}
