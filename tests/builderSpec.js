var fs = require('fs');
var child_process = require('child_process');
var rest = require('restler');
var builder = require('../builder');

describe('The builder module', function () {
    var testModule = {name: 'test',
                      version: '1',
                      releaseDate: '20140502',
                      releaseNumber: '2'};

    var testRoot = {name: 'fedora',
                    version: '20',
                    arch: 'armhfp'};

    describe('MockBuilder', function () {
        beforeEach(function () {
            spyOn(child_process, 'exec');
        });

        it('starts a build', function () {
            var mockBuilder = new builder.MockBuilder();

            mockBuilder.start(testRoot, 'http://myhost/mysrpm.src.rpm');

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

            srpmBuilder.start(testModule, '333333333333333333',
                              function () {});
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
        beforeEach(function () {
            jasmine.Clock.useMock();

            spyOn(builder, 'SRPMBuilder').andCallFake(function () {
                var mock = {};

                mock.start = function(module, callback) {
                    setTimeout(function () {
                        callback();
                    }, 1);
                };

                return mock;
            });

            spyOn(builder, 'MockBuilder').andCallFake(function () {
                var mock = {};

                mock.start = function(root, srpmUrl, callback) {
                    setTimeout(function () {
                        callback();
                    }, 1);
                };

                return mock;
            });

            spyOn(builder, 'CoprBuilder').andCallFake(function () {
                var mock = {};

                mock.start = function(srpmUrl, callback) {
                    setTimeout(function () {
                        callback();
                    }, 1);
                };

                return mock;
            });
        });

        it('starts an srpm build', function () {
            var queue = new builder.Queue();
            queue.addBuild({module: testModule,
                            commit: "4444444444444444"});

            jasmine.Clock.tick(1);

            expect(builder.SRPMBuilder).toHaveBeenCalled();
        });

        it('starts a copr build', function () {
            var queue = new builder.Queue();
            queue.addBuild({module: testModule,
                            commit: "4444444444444444"});

            jasmine.Clock.tick(2);

            expect(builder.CoprBuilder).toHaveBeenCalled();
            expect(builder.MockBuilder).not.toHaveBeenCalled();
        });

        it('starts a mock build', function () {
            var queue = new builder.Queue();
            queue.addBuild({module: testModule,
                            commit: "4444444444444444",
                            useMock: true,
                            root: testRoot});

            jasmine.Clock.tick(2);

            expect(builder.CoprBuilder).not.toHaveBeenCalled();
            expect(builder.MockBuilder).toHaveBeenCalled();
        });

        it('start builds in the right order', function () {
            var queue = new builder.Queue();

            queue.addBuild({module: testModule,
                            commit: "4444444444444444"});

            queue.addBuild({module: testModule,
                            commit: "4444444444444444",
                            useMock: true,
                            root: testRoot});

            jasmine.Clock.tick(1);

            expect(builder.CoprBuilder).toHaveBeenCalled();

            jasmine.Clock.tick(1);

            expect(builder.MockBuilder).not.toHaveBeenCalled();
        });
    });

});