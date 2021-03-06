var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var rest = require('restler');
var config = require('./config-' + process.env.NODE_ENV);

var builder = {};

builder.computeSRPMUrl = function(build) {
    var module = build.module;

    var rpmPath = path.join('rpmbuild', 'SRPMS', module.name +
        '-' + module.version +
        '-' + module.releaseNumber +
        '.' + module.releaseDate +
        'git' + build.commit +
        '.fc20.src.rpm');

        return 'http://' + config.hostName + '/out/' + rpmPath;
};

builder.MockBuilder = function () {
    this.start = function (root, srpmUrl, callback) {
        console.log('Building ' + srpmUrl + ' using mockremote, on ' +
                    root.name);

        var rootId = root.name +  '-' + root.version + '-' + root.arch;

        var args = ['scripts/mockremote.py', '-b',
                    config.builders[root.arch], '-r', rootId,
                    '--destdir', './out', '-a',
                    'http://' + config.hostName + '/out/', srpmUrl];

        var process = child_process.spawn('python', args,
                                          { stdio: 'inherit' });
        process.on('close', function (code) {
            if (callback) {
                callback(null);
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
        var args = ['-g', '-C', path.join('out', 'rpmbuild', 'SOURCES'),
                    getSpecPath(module)];

        var process = child_process.spawn('spectool', args,
                                          {stdio: 'inherit'});
        process.on('close', function (code) {
                callback(null);
        });
    }

    function buildSRPM(module, callback) {
        var args = ['-bs', getSpecPath(module), '-D',
                    '_topdir ' + './out/rpmbuild'];

        var process = child_process.spawn('rpmbuild', args,
                                          {stdio: 'inherit'});
        process.on('close', function (code) {
            callback(null);
        });
    }

    this.start = function (module, commit, callback) {
        console.log('Building an srpm of ' + module.name + ' ' + commit);

        createSpec(module, commit, function (error) {
            downloadSource(module, function (error) {
                buildSRPM(module, function (error) {
                    if (callback) {
                        callback(null);
                    }
                });
            });
        });
    };
};

builder.CoprBuilder = function () {
    this.start = function start(srpmUrl, callback) {
        console.log('Start a copr build of ' + srpmUrl);

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

    function nextBuild() {
        var build = builds.pop();

        if (!build) {
            building = false;
            return;
        }

        building = true;

        srpmUrl = builder.computeSRPMUrl(build);

        var srpmBuilder = new builder.SRPMBuilder();
        srpmBuilder.start(build.module, build.commit, function (error) {
            if (build.useMock) {
                var mockBuilder = new builder.MockBuilder();
                mockBuilder.start(build.root, srpmUrl, function () {
                    nextBuild();
                });
            } else {
                var coprBuilder = new builder.CoprBuilder();
                coprBuilder.start(srpmUrl, function () {
                    nextBuild();
                });
            }
        });
    }

    this.addBuild = function (build) {
        console.log('Build of ' + build.module.name + ' ' + build.commit +
                    ' on ' + build.commit + ' added to the queue');

        builds.push(build);

        if (!building) {
            nextBuild();
        }
    };
};
 
module.exports = builder;
