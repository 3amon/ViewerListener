var express = require('express');
var app = express();
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var path = require('path');
var csv = Promise.promisifyAll(require('csv'));

var audioDir = process.env.AUDIO_PROCESS_OUTPUT_DIR;

function endsWith(str, suffix) {
    if (typeof suffix === "undefined") { // partial
        // This is a little odd. You generally want to put your arguments in order
        // of most likely to be bound BUT endsWith implies an order and you most likely
        // want to bind the suffix. So we will treat the suffix as the first argument
        // if we get passed 1 argument and return a bound function
        var tempSuff = str;
        return function (str) {
            return str.indexOf(tempSuff, str.length - tempSuff.length) !== -1;
        };
    }
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

app.get('/audio-data/', function(req, res) {

    fs.readdirAsync(audioDir).filter(endsWith('.wav.csv')).map(function(fileName) {
        var contents = fs.readFileAsync(path.join(audioDir, fileName), 'utf8').then(csv.parseAsync);
        return Promise.join(contents, function (contents) {
            return {
                fileName: fileName,
                contents: contents
            }
        });
    }).then (function(dataList) {
        res.send(dataList);
    }).catch(function(e) {
        console.error(e.stack);
    });
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.listen(5312, function () {
    console.log('Example app listening on port 5312!');
});