"use strict";

var config = require("./config/config");
var express = require('express'),
    path = require('path'),
    fs = require('fs');
var app = express();

// environment and port
var env = process.env.NODE_ENV || 'development';
var port;
if (config && config.http && config.http.port)
  port = config.http.port;
else
  port = 3000;

// copy client-side script from dependency
function copy(fromPath, toPath) {
  var fromStream = fs.createReadStream(path.join(__dirname, fromPath));
  var toStream = fs.createWriteStream(path.join(__dirname, toPath));
  fromStream.pipe(toStream);
}
copy('node_modules/nodep-date-input-polyfill/nodep-date-input-polyfill.dist.js',
     'public/scripts/nodep-date-input-polyfill.dist.js');
copy('node_modules/jquery/dist/jquery.min.js',
     'public/scripts/jquery.min.js');
copy('node_modules/jquery/dist/jquery.min.map',
     'public/scripts/jquery.min.map');
copy('node_modules/jquery/dist/jquery.js',
     'public/scripts/jquery.js');

// app middleware/settings
app.engine('.html', require('ejs').__express);
app.enable('trust proxy')
  .use(require('body-parser').json())
  .use(require('body-parser').urlencoded({extended: false}))
  .use(require('method-override')())
  .use(function(req,res,next){
    res.locals.req = req;
    next();
  });

app.use(express.static(__dirname + '/public'));


// development vs production
if (env == "development")
  app.use(require('errorhandler')({dumpExceptions: true, showStack: true}));
else
  app.use(require('errorhandler')());


// helpers and routes
app.locals.helpers = require("./app/helpers");
app.locals.config = require("./config/config");

require("./app/routes")(app);

// boot it up!
if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %s in %s mode", port, env);
  });
}

else
  exports.app = app;
