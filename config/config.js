var fs = require('fs');
var yaml = require('js-yaml');

var args = require('minimist')(process.argv.slice(2));
var config_path = args.config || 'config/config.yaml';
module.exports = yaml.safeLoad(fs.readFileSync(config_path));
