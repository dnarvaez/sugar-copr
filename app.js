var express = require('express');
var moment = require('moment');
var fs = require('fs');
var mkdirp = require('mkdirp');
var rest = require('restler');
var builder = require('./builder');
var config = require('./config-' + process.env.NODE_ENV);

var app = express();

app.use(express.bodyParser());
app.use('/out', express.static('out'));
app.use('/out', express.directory('out'));

function setupOutDir() {
    mkdirp.sync('./out/rpmbuild/SOURCES');
    mkdirp.sync('./out/rpmbuild/SPECS');
}

function fetchVersion(module, commit, callback) {
    var url = 'https://raw.github.com/sugarlabs/' + module.name +
        '/' + commit + '/configure.ac';
    rest.get(url).on('complete', function (data, response) {
        callback(null, /AC_INIT\(\[[^\]]+],\[([^\]]+)/g.exec(data)[1]);
    });
}

function getReleaseNumber(module, callback) {
    var jsonPath = 'releases.json';

    fs.readFile(jsonPath, {
        encoding: 'utf8'
    }, function (error, data) {
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
    module.releaseDate = moment().format('YYYYMMDD');

    fetchVersion(module, commit, function (error, version) {
        module.version = version;

        getReleaseNumber(module, function (error, releaseNumber) {
            module.releaseNumber = releaseNumber;

            var queue = builder.Queue();

            builder.addBuild({module: module,
                              commit: commit});

            builder.addBuild({module: module,
                              commit: commit,
                              useMock: true,
                              root: {name: 'fedora',
                                     version: '20',
                                     arch: 'armhfp'}});
        });
    });
}

app.post('/api/github', function (request, response) {
    var payload = JSON.parse(request.body.payload);
    buildModule(payload.repository.name,
        payload.head_commit.id.slice(0, 7));
    response.send(200);
});

app.post('/api/build/:name/:commit', function (request, response) {
    buildModule(request.params.name, request.params.commit);
    response.send(200);
});

app.get('/repo/:name', function (request, response) {
    var name = request.params.name;
    var baseUrl = 'http://copr-be.cloud.fedoraproject.org' +
                  '/results/dnarvaez/sugar/';

    if (name.indexOf('armhfp') > -1) {
        baseUrl = 'http://' + config.hostName + '/out/';
    }

    response.send('[sugar-master]\n' +
        'name=Sugar (master)\n' +
        'description=Sugar Learning Platform\n' +
        'baseurl=' + baseUrl + name + '\n' +
        'skip_if_unavailable=True\n' +
        'gpgcheck=0\n' +
        'enabled=1\n');
});

setupOutDir();

app.listen(3000);
