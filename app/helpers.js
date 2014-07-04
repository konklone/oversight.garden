// view helpers

module.exports = {

  truncate: function(text, limit) {
    if (text.length > limit)
      return text.substr(0, limit);
    else
      return text;
  }

}