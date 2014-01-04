var express = require('express');
var child_process = require('child_process');
var rest = require('restler');
var moment = require('moment');
var fs = require('fs');
var path = require('path');

var app = express();

app.use(express.bodyParser());
app.use('/static', express.static('rpmbuild'));
app.use('/static', express.directory('rpmbuild'));

function getSpecPath(module) {
    return path.join('rpmbuild', "SPECS", module + '.spec');
}

function ensureTopDir() {
    fs.mkdirSync("./rpmbuild")
    fs.mkdirSync("./rpmbuild/SOURCES")
    fs.mkdirSync("./rpmbuild/SPECS")
}

function createSpec(module, commit, callback) {
    var sourcePath = path.join('specs', module + '.spec');

    fs.readFile(sourcePath, {encoding: 'utf8'}, function (err, data) {
        data = data.replace("@shortcommit@", commit);
        data = data.replace("@release_date@", moment().format("YYYYMMDD"));

        fs.writeFile(getSpecPath(module), data, function (err) {
            callback(null);
        });
    });
}

function downloadSource(module, callback) {
    var command = 'spectool -g ' +
                  '-C ' + path.join('rpmbuild', 'SOURCES') +
                  ' ' + getSpecPath(module);

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function buildSRPM(module, callback) {
    var command = 'rpmbuild' +
                  ' -bs ' + getSpecPath(module) +
                  ' -D \'_topdir ' + './rpmbuild\'';

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function startCoprBuild(module, commit, callback) {
    var rpmPath = path.join('rpmbuild', 'SRPM', module +
                            '-0.101.0-1.20140104git' + commit +
                            'fc20.src.rpm');

    var rpmUrl = 'http://95.85.29.189:3000/' + rpmPath;

    var apiUrl = 'http://copr-fe.cloud.fedoraproject.org' +
                 '/api/coprs/dnarvaez/sugar/new_build/';

    var options = { 'data': {'pkgs': rpmUrl},
                    'username': 'pcilfugjuvtpxtkgidle',
                    'password': 'rfgpcvynsuztzycghbayglfzxacijy'};

    rest.post(apiUrl, options).on('complete', function(data, response) {
        callback(null);
    });
}

app.post('/api/build/:module/:commit', function (request, response) {
    var module = request.params.module;
    var commit = request.params.commit;

    response.send(200);

    createSpec(module, commit, function (error) {
        downloadSource(module, function (error) {
            buildSRPM(module, function (error) {
                startCoprBuild(module, commit, function (error) {
                });
            });
        });
    });
});

ensureTopDir();

app.listen(3000);
