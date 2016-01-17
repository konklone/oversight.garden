"use strict";

var fs = require('fs');
var yaml = require('js-yaml');

var args = require('minimist')(process.argv.slice(2));
var config_path;
if (args.config) {
  config_path = args.config;
} else if (global.isMocha) {
  config_path = 'test/config.yaml';
} else {
  config_path = 'config/config.yaml';
}
module.exports = yaml.safeLoad(fs.readFileSync(config_path));
