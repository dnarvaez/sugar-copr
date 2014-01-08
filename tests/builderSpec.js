var fs = require('fs');
var child_process = require('child_process');
var rest = require('restler');
var builder = require('../builder');

describe('The builder module', function () {
    var testModule = {name: 'test',
                      version: '1',
                      releaseDate: '20140502',
                      releaseNumber: '2',
                      commit: '333333333333333333'};

    describe('MockBuilder', function () {
        beforeEach(function () {
            spyOn(child_process, 'exec');
        });

        it('starts a build', function () {
            var root = {'name': 'fedora',
                        'version': '20',
                        'arch': 'armhfp'};

            var mockBuilder = new builder.MockBuilder(root);

            mockBuilder.start('http://myhost/mysrpm.src.rpm');

            expect(child_process.exec).toHaveBeenCalledWith(
                'python scripts/mockremote.py ' +
                '-b testarmhfpbuilder ' +
                '-r fedora-20-armhfp ' +
                '--destdir ./out ' +
                '-a http://testhost/out/ ' +
                'http://myhost/mysrpm.src.rpm', any(Function));
        });
    });

    describe('SRPMBuilder', function () {
        beforeEach(function () {
            spyOn(fs, 'readFile').andCallFake(
                function (path, options, callback) {
                    expect(path).toEqual("specs/test.spec");

                    callback(null,
                             '%define version @version@\n' +
                             '%define release_number @release_number@\n' +
                             '%define release_date @release_date@\n' +
                             '%define shortcommit @shortcommit@\n');
                });
        });

        it('builds an rpm', function () {
            var srpmBuilder = new builder.SRPMBuilder();
            var nCommand = 0;

            spyOn(fs, 'writeFile').andCallFake(
                function (path, data, callback) {
                    expect(path).toEqual('out/rpmbuild/SPECS/test.spec');

                    expect(data).toEqual(
                        '%define version 1\n' +
                        '%define release_number 2\n' +
                        '%define release_date 20140502\n' +
                        '%define shortcommit 333333333333333333\n');

                    callback();
                });

            spyOn(child_process, 'exec').andCallFake(
                function (command, callback) {
                    switch (nCommand) {
                        case 0:
                            expect(command).toEqual(
                                'spectool -g -C out/rpmbuild/SOURCES' +
                                ' out/rpmbuild/SPECS/test.spec');
                            break;
                        case 1:
                            expect(command).toEqual(
                                'rpmbuild -bs out/rpmbuild/SPECS/test.spec' +
                                ' -D \'_topdir ./out/rpmbuild\'');
                    }

                    nCommand++;

                    callback();
                });

            srpmBuilder.start(testModule, function () {});
        });
    });

    describe('CoprBuilder', function () {
        it('triggers a copr build', function () {
            var coprBuilder = new builder.CoprBuilder();

            spyOn(rest, 'post').andCallFake(
                function (apiUrl, options) {
                    expect(apiUrl).toEqual(jasmine.any(String));
                    expect(options.username).toEqual('mylogin');
                    expect(options.password).toEqual('mytoken');
                    expect(options.data.pkgs).toEqual('http://test.src.rpm');

                    return {on: function () {}};
                });

            coprBuilder.start('http://test.src.rpm', function () {});
        });
    });

    describe('Queue', function () {
        it('starts a copr build', function () {
        });
    });

});
