#!/usr/bin/env node

var fs = require('fs');
var tv4 = require('tv4');

FILES_SYNTAX = [
    'package.json',
    'config/index.json',
    'config/mappings/reports.json'
];

for (var i = 0; i < FILES_SYNTAX.length; i++) {
    var content = fs.readFileSync(FILES_SYNTAX[i], 'utf8');
    try {
        JSON.parse(content);
    } catch (e) {
        process.stderr.write(e + '\n');
        process.exit(1);
    }
}

var metadata_content = fs.readFileSync('config/inspectors.json', 'utf8');
var schema_content = fs.readFileSync('config/inspectors.json.schema', 'utf8');
try {
    var metadata = JSON.parse(metadata_content);
    var schema = JSON.parse(schema_content);
    var result = tv4.validateResult(metadata, schema, false, true);
    if (!result.valid) {
        process.stderr.write(result.error + '\n');
        process.stderr.write('dataPath: ' + result.error.dataPath + '\n');
        process.stderr.write('schemaPath: ' + result.error.schemaPath + '\n');
        for (var i = 0; i < result.error.subErrors.length; i++) {
            process.stderr.write('subErrors[' + i + ']: ' + result.error.subErrors + '\n');
        }
        process.exit(1);
    }
} catch (e) {
    process.stderr.write(e + '\n');
    process.exit(1);
}
