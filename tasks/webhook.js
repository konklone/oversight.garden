"use strict";

var bodyParser = require("body-parser");
var child_process = require("child_process");
var express = require("express");
var fs = require("fs");
var https = require("https");

var token = require("../config/config").webhook.token;

var certificate = fs.readFileSync("/home/ubuntu/letsencrypt-scrapers.fullchain.pem");
var key = fs.readFileSync("/home/ubuntu/letsencrypt-scrapers.privkey.pem");

var serverOptions = {
  key: key,
  cert: certificate,
  secureProtocol: "TLSv1_2_method",
};

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post("/deploy", function(req, res) {
  if (req.body.token && req.body.token === token) {
    res.writeHead(200);
    child_process.spawn("/usr/bin/git", ["checkout", "-q", "master"], {
      cwd: "/home/ubuntu/inspectors-general",
      stdio: "ignore"
    }).on("exit", function(code) {
      if (code === 0) {
        child_process.spawn("/usr/bin/git", ["pull", "-q", "origin", "master"], {
          cwd: "/home/ubuntu/inspectors-general",
          stdio: "ignore"
        }).on("exit", function(code) {
          if (code === 0) {
            res.end(JSON.stringify({text: "Successfully deployed scrapers"}));
          } else {
            res.end(JSON.stringify({text: "`git pull origin master` failed with an exit code of " + code}));
          }
        }).on("error", function(err) {
          res.end(JSON.stringify({text: "Error while pulling: " + err}));
        });
      } else {
        res.end(JSON.stringify({text: "`git checkout master` failed with an exit code of " + code}));
      }
    }).on("error", function(err) {
      res.end(JSON.stringify({text: "Error while checking out: " + err}));
    });
  } else {
    res.writeHead(403);
    res.end();
  }
});

var server = https.createServer(serverOptions, app);
server.listen(4443);
