var express = require('express');
var app = express();
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var path = require('path');
var csv = Promise.promisifyAll(require('csv'));
var clusterfck = require("clusterfck");
var clustering = require('density-clustering');


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

function leaves(hcluster) {
    // flatten cluster hierarchy
    if(!hcluster.left)
        return [hcluster];
    else
        return leaves(hcluster.left).concat(leaves(hcluster.right));
}

app.get('/audio-data/', function(req, res) {

    fs.readdirAsync(audioDir).filter(endsWith('.wav.csv')).map(function(fileName) {
        var contents = fs.readFileAsync(path.join(audioDir, fileName), 'utf8').then(csv.parseAsync);
        return Promise.join(contents, function (contents) {
            return {
                fileName: fileName,
                contents: contents[0].map(function(value){
                    return parseFloat(value);
                })
            }
        });
    }).then (function(dataList) {
        var data = [];
        for(var rowNum = 0; rowNum < dataList.length; ++ rowNum)
        {
            var row = [];
            for(var eleNum = 0; eleNum < dataList[rowNum].contents.length; ++ eleNum)
            {
                var x = dataList[rowNum].contents[eleNum];
                row.push(x);
            }
            data.push(row);
        }
        var tree = leaves(clusterfck.hcluster(data, "euclidean", "average", 1.0));
        res.send(tree);
    }).catch(function(e) {
        console.error(e.stack);
    });
});

app.get('/', function (req, res) {
    res.send('Hello World!');
});

function GetDataSet(callback)
{
    fs.readdirAsync(audioDir).filter(endsWith('.wav.csv')).map(function(fileName) {
        var contents = fs.readFileAsync(path.join(audioDir, fileName), 'utf8').then(csv.parseAsync);
        return Promise.join(contents, function (contents) {
            return {
                fileName: fileName,
                contents: contents[0].map(function(value){
                    return parseFloat(value);
                })
            }
        });
    }).then (function(dataList) {
        callback(dataList);
    }).catch(function(e) {
        console.error(e.stack);
    });
}

function test2()
{
    GetDataSet(function(dataList)
    {
        var dataset = dataList.map(function(ele) { return ele.contents} );
        var optics = new clustering.OPTICS();
        // parameters: 2 - neighborhood radius, 2 - number of points in neighborhood to form a cluster
        var clusters = optics.run(dataset, 100, 2);
        var plot = optics.getReachabilityPlot();
        console.log(clusters, plot);
    });


}

function test()
{
    GetDataSet(function(dataList) {
        var data = dataList.map(function (ele) {
            return ele.contents
        });
        var dbscan = new clustering.DBSCAN();
        var distance = 5.0;
        var noiseFraction = 0.0;
        while (noiseFraction < 0.05) {
            console.log("Trying distance: " + distance);
            var clusters = dbscan.run(data, distance, 2);
            noiseFraction = dbscan.noise.length / data.length;
            distance = distance / 2.0;
        }
        console.log(clusters, dbscan.noise);
    });
}

app.listen(5312, function () {
    console.log('Example app listening on port 5312!');
    test2();
});