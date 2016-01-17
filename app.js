var config = require("./config/config");
var express = require('express'),
    path = require("path");
var app = express();

// environment and port
var env = process.env.NODE_ENV || 'development';
var port;
if (config && config.http && config.http.port)
  port = config.http.port;
else
  port = 3000;

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

var routes = require("./app/routes");
app.get('/', routes.index);
app.get('/reports', routes.reports);
app.get('/reports.xml', routes.reports_xml);
app.get('/inspectors', routes.inspectors);
app.get('/inspector/:inspector', routes.inspector);
app.get('/report/:inspector/:report_id', routes.report);

// boot it up!
if (!module.parent) {
  app.listen(port, function() {
    console.log("Express server listening on port %s in %s mode", port, env);
  });
}

else
  exports.app = app;
