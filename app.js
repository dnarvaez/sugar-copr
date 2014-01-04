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

function ensureTopDir() {
    try {
        fs.mkdirSync("./rpmbuild");
        fs.mkdirSync("./rpmbuild/SOURCES");
        fs.mkdirSync("./rpmbuild/SPECS");
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
                  '-C ' + path.join('rpmbuild', 'SOURCES') +
                  ' ' + module.specPath;

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function buildSRPM(module, callback) {
    var command = 'rpmbuild' +
                  ' -bs ' + module.specPath +
                  ' -D \'_topdir ' + './rpmbuild\'';

    child_process.exec(command, function(error, stdout, stderr) {
        callback(null);
    });
}

function startCoprBuild(module, callback) {
    var rpmPath = path.join('rpmbuild', 'SRPM', module.name +
                            '-' + module.version +
                            '-' + module.releaseNumber +
                            '.' + module.releaseDate +
                            'git' + module.commit +
                            'fc20.src.rpm');

    var rpmUrl = 'http://95.85.29.189:3000/static/' + rpmPath;

    var apiUrl = 'http://copr-fe.cloud.fedoraproject.org' +
                 '/api/coprs/dnarvaez/sugar/new_build/';

    var options = { 'data': {'pkgs': rpmUrl},
                    'username': 'pcilfugjuvtpxtkgidle',
                    'password': 'rfgpcvynsuztzycghbayglfzxacijy'};

    rest.post(apiUrl, options).on('complete', function(data, response) {
        callback(null);
    });
}

function fetchVersion(module, callback) {
    var url = 'https://raw.github.com/sugarlabs/' +
              'sugar-datastore/' + module.commit + '/configure.ac';
    
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

function buildModule(name, commit) {
    var module = {};

    module.name = name;
    module.commit = commit;
    module.releaseDate = moment().format("YYYYMMDD");
    module.specPath = path.join('rpmbuild', "SPECS", module.name + '.spec');

    fetchVersion(module, function(error, version) {
        module.version = version; 

        getReleaseNumber(module, function(error, releaseNumber) {
            module.releaseNumber = releaseNumber;

            createSpec(module, function (error) {
                downloadSource(module, function (error) {
                    buildSRPM(module, function (error) {
                        startCoprBuild(module, function (error) {
                        });
                    });
                });
            });
        });
    });
}

app.post('/api/github', function (request, response){
    var payload = JSON.parse(request.body.payload);
    buildModule(payload.repository.name,
                payload.head_commit.id.splice(0, 7));
    response.send(200);
});

app.post('/api/build/:name/:commit', function (request, response) {
    buildModule(request.params.name, request.params.commit);
    response.send(200);
});

ensureTopDir();

app.listen(3000);
