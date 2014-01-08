var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var rest = require('restler');
var config = require('./config-' + process.env.NODE_ENV || 'test');

var builder = {};

builder.MockBuilder = function () {
    this.start = function (root, srpmUrl, callback) {
        var rootId = root.name +  '-' + root.version + '-' + root.arch;

        var command = 'python scripts/mockremote.py' +
                      ' -b ' + config.builders[root.arch] +
                      ' -r ' + rootId +
                      ' --destdir ' + './out' +
                      ' -a http://' + config.hostName + '/out/' +
                      ' ' + srpmUrl;

        child_process.exec(command, function (error, stdout, stderr) {
            if (callback) {
                callback(error);
            }
        });
    };
};

builder.SRPMBuilder = function () {
    function getSpecPath(module) {
        return path.join('out', 'rpmbuild', 'SPECS', module.name + '.spec');
    }

    function createSpec(module, commit, callback) {
        var sourcePath = path.join('specs', module.name + '.spec');

        fs.readFile(sourcePath, {
            encoding: 'utf8'
        }, function (error, data) {
            data = data.replace('@version@', module.version);
            data = data.replace('@shortcommit@', commit);
            data = data.replace('@release_date@', module.releaseDate);
            data = data.replace('@release_number@', module.releaseNumber);

            fs.writeFile(getSpecPath(module), data, function (err) {
                callback(null);
            });
        });
    }

    function downloadSource(module, callback) {
        var command = 'spectool -g ' +
            '-C ' + path.join('out', 'rpmbuild', 'SOURCES') +
            ' ' + getSpecPath(module);

        child_process.exec(command, function (error, stdout, stderr) {
            callback(null);
        });
    }

    function buildSRPM(module, callback) {
        var command = 'rpmbuild' +
            ' -bs ' + getSpecPath(module) +
            ' -D \'_topdir ' + './out/rpmbuild\'';

        child_process.exec(command, function (error, stdout, stderr) {
            callback(null);
        });
    }

    this.start = function (module, callback) {
        createSpec(module, function (error) {
            downloadSource(module, function (error) {
                buildSRPM(module, callback);
            });
        });
    };
};

builder.CoprBuilder = function () {
    this.start = function start(srpmUrl, callback) {
        var apiUrl = 'http://copr-fe.cloud.fedoraproject.org' +
            '/api/coprs/dnarvaez/sugar/new_build/';

        var options = {
            'data': {
                'pkgs': srpmUrl
            },
            'username': config.coprLogin,
            'password': config.coprToken
        };

        rest.post(apiUrl, options).on('complete', function (data, response) {
            if (callback) {
                callback(null);
            }
        });
    };
};

builder.Queue = function (builders) {
    var builds = [];
    var building = false;

    builders = builders || {};

    if (!builders.srpm) {
        builders.srpm = SRPMBuilder();
    }

    if (!builders.copr) {
        builders.copr = CoprBuilder();
    }

    if (!builders.mock) {
        builders.mock = MockBuilder();
    }

    function nextBuild() {
        var build = builds.pop();

        if (!build) {
            building = false;
            return;
        }

        building = true;

        builders.srpm.start(build.module, function (error, srpmUrl) {
            if (build.useMock) {
                builders.mock.start(build.root, srpmUrl, function () {
                    nextBuild();
                });
            } else {
                builders.copr.start(srpmUrl, function () {
                    nextBuild();
                });
            }
        });
    }

    this.addBuild = function (build) {
        builds.push(build);

        if (!building) {
            nextBuild();
        }
    };
};
 
module.exports = builder;
