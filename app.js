var express = require('express');
var child_process = require('child_process');
var rest = require('restler');
var moment = require('moment');
var fs = require('fs');
var path = require('path');
var config = require('./config');

var app = express();

app.use(express.bodyParser());
app.use('/out', express.static('out'));
app.use('/out', express.directory('out'));

function setupOutDir() {
    try {
        fs.mkdirSync("./out");
        fs.mkdirSync("./out/rpmbuild");
        fs.mkdirSync("./out/rpmbuild/SOURCES");
        fs.mkdirSync("./out/rpmbuild/SPECS");
    } catch(err) {
    }
}

function createSpec(module, callback) {
    var sourcePath = path.join('specs', module.name + '.spec');

    fs.readFile(sourcePath, {encoding: 'utf8'}, function (error, data) {
        data = data.replace("@version@", module.version);
        data = data.replace("@shortcommit@", module.commit);
        data = data.replace("@release_date@", module.releaseDate);
        data = data.replace("@release_number@", module.releaseNumber);

        fs.writeFile(module.specPath, data, function (err) {
            callback(null);
        });
    });
}

function downloadSource(module, callback) {
    var command = 'spectool -g ' +
                  '-C ' + path.join('out', 'rpmbuild', 'SOURCES') +
                  ' ' + module.specPath;

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function buildSRPM(module, callback) {
    var command = 'rpmbuild' +
                  ' -bs ' + module.specPath +
                  ' -D \'_topdir ' + './out/rpmbuild\'';

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function getSRPMUrl(module) {
    var rpmPath = path.join('rpmbuild', 'SRPMS', module.name +
                            '-' + module.version +
                            '-' + module.releaseNumber +
                            '.' + module.releaseDate +
                            'git' + module.commit +
                            '.fc19.src.rpm');

    return 'http://95.85.29.189:3000/out/' + rpmPath;
}

function startMockBuild(module, rootName, host, callback) {
    var command = 'python scripts/mockremote.py' +
                  ' -b ' + host +
                  ' -r ' + rootName +
                  ' --destdir ' + './out' +
                  ' ' + getSRPMUrl(module);

    child_process.exec(command, function(error, stdout, stderr) {
        if (callback) {
            callback(null);
        }
    });
}

function startCoprBuild(module, callback) {
    var apiUrl = 'http://copr-fe.cloud.fedoraproject.org' +
                 '/api/coprs/dnarvaez/sugar/new_build/';

    var options = {'data': {'pkgs': getSRPMUrl(module)},
                   'username': config.username,
                   'password': config.password};

    rest.post(apiUrl, options).on('complete', function(data, response) {
        if (callback) {
            callback(null);
        }
    });
}

function fetchVersion(module, callback) {
    var url = 'https://raw.github.com/sugarlabs/' + module.name +
              '/' + module.commit + '/configure.ac';
    rest.get(url).on('complete', function(data, response) {
        callback(null, /AC_INIT\(\[[^\]]+],\[([^\]]+)/g.exec(data)[1]);
    });
}

function getReleaseNumber(module, callback) {
    var jsonPath = 'releases.json';

    fs.readFile(jsonPath, {encoding: 'utf8'}, function (error, data) {
        var releases = {};

        if (!error) {
            releases = JSON.parse(data);
        }

        if (releases[module.name] === undefined) {
            releases[module.name] = 1; 
        } else {
            releases[module.name]++;
        }

        data = JSON.stringify(releases);

        fs.writeFile(jsonPath, data, function (error) {
            callback(null, releases[module.name]);
        });
    });
} 

function startArmBuilds() {
    startMockBuild(module, "fedora-18-armhfp", function (error) {
        startMockBuild(module, "fedora-19-armhfp", function (error) {
            startMockBuild(module, "fedora-20-armhfp", function (error) {
            });
        });
    });
}

function buildModule(name, commit) {
    var module = {};

    module.name = name;
    module.commit = commit;
    module.releaseDate = moment().format("YYYYMMDD");
    module.specPath = path.join('out', 'rpmbuild', "SPECS",
                                module.name + '.spec');

    fetchVersion(module, function(error, version) {
        module.version = version; 

        getReleaseNumber(module, function(error, releaseNumber) {
            module.releaseNumber = releaseNumber;

            createSpec(module, function (error) {
                downloadSource(module, function (error) {
                    buildSRPM(module, function (error) {
                        startCoprBuild(module);
                        startArmBuilds(module);
                    });
                });
            });
        });
    });
}

app.post('/api/github', function (request, response){
    var payload = JSON.parse(request.body.payload);
    buildModule(payload.repository.name,
                payload.head_commit.id.slice(0, 7));
    response.send(200);
});

app.post('/api/build/:name/:commit', function (request, response) {
    buildModule(request.params.name, request.params.commit);
    response.send(200);
});

setupOutDir();

app.listen(3000);
