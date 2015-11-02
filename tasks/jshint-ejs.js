#!/usr/bin/env node

var async = require("async");
var ejs = require("ejs");
var fs = require("fs");
var intercept = require("intercept-stdout");
var jshint = require("jshint").JSHINT;

var jshint_options = {
  "-W032": true,  // Don't warn about extra semicolons
  "-W085": true,  // Don't warn about use of with
  "laxcomma": true,  // Don't warn about newlines before commas
  "asi": true,  // Don't warn about missing semicolons
};

function find_real_line(error, source) {
  var lineStart = 0;
  for (var line = 1; line < error.line; line++) {
    lineStart = source.indexOf("\n", lineStart + 1);
    if (lineStart == -1) {
      throw new Error("Could not find line " + error.line);
    }
  }

  var errorLocation = lineStart + error.character;
  var lineMarkerLocation = source.lastIndexOf("__line = ", errorLocation);
  var semicolonLocation = source.indexOf(";", lineMarkerLocation);
  var lineNumberText = source.substring(lineMarkerLocation + "__line = ".length,
    semicolonLocation);
  var templateLineNumber = parseInt(lineNumberText);

  if (isNaN(templateLineNumber) || semicolonLocation == -1 ||
    lineMarkerLocation == -1) {
    throw new Error("Could not find line number marker");
  }
  return templateLineNumber;
}

var exit_code = 0;

async.eachSeries(process.argv.slice(2),
  function(arg, done) {
    var contents = fs.readFileSync(arg, {encoding: "utf-8"});
    var source = "";

    // ejs doesn't provide an easy way to get the uncompiled source of a
    // template. However, it does print this with console.log() when the debug
    // option is set. Thus, we temporarily divert standard output to capture
    // the function source.
    var unhook_intercept = intercept(function(text) {
      source += text;
      return "";
    });
    ejs.compile(contents, {filename: arg, debug: true});
    unhook_intercept();

    jshint(source, jshint_options);
    if (jshint.errors.length > 0) {
      exit_code = 1;
    }

    for (var i = 0; i < jshint.errors.length; i++) {
      var error = jshint.errors[i];
      if (error === null) {
        continue;
      }
      var templateLine = find_real_line(error, source);
      var message = arg + ": line " + templateLine + ", " + error.reason;
      console.error(message);
    }

    done();
  },
  function(error) {
    if (error) {
      console.error("Error encountered: " + error);
      process.exit(1);
    }
    process.exit(exit_code);
  }
);
