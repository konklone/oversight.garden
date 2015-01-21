// view helpers

var qs = require("querystring");

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
  }

}