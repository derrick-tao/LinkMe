process.env.NODE_ENV = 'testing';

var app = require('../app');
var should = require('should');
var util = app.util;

describe('app', function() {

    describe('getFullPath(shortKey)', function() {
        it('should return "{hostname}:{port}/" when arg shortKey is undefined', function() {
            var shortKey = undefined;
            util.getFullPath(shortKey).should.equal(app.HOSTNAME + ":" + app.PORT + "/");
        });

        it('should return "{hostname}:{port}/{shortKey} when arg shortKey is defined', function() {
            var shortKey = 'abc';
            util.getFullPath(shortKey).should.equal(app.HOSTNAME + ":" + app.PORT + "/" + shortKey);
        })
    });

    describe('addHttpToUrlIfMissingProtocol(longUrl)', function() {
        it('should add http:// if longUrl does not have protocol', function() {
            var longUrl = 'google.com';
            util.addHttpToUrlIfMissingProtocol(longUrl).should.equal('http://' + longUrl);
        });

        describe('should not add http:// if longUrl already', function() {
            it('starts with http://', function() {
                var longUrl = 'http://google.com';
                util.addHttpToUrlIfMissingProtocol(longUrl).should.equal(longUrl);
            });

            it('starts with ftp://', function() {
                var longUrl = 'ftp://google.com';
                util.addHttpToUrlIfMissingProtocol(longUrl).should.equal(longUrl);
            });
        });

        describe('should throw Error if longUrl', function() {
            it('is undefined', function() {
                var longUrl = undefined;
                // util.addHttpToUrlIfMissingProtocol(longUrl).should.throw();
                (function() {
                    util.addHttpToUrlIfMissingProtocol(longUrl);
                }).should.throw();
            });

            it('is empty', function() {
                var longUrl = '';
                (function() {
                    util.addHttpToUrlIfMissingProtocol(longUrl)
                }).should.throw();
            });
        });
    });

    describe('isValidPath(pathName)', function() {
        describe('should return false if pathName', function() {
            it('is undefined', function() { util.isValidPath(undefined).should.be.false; });

            it('is empty', function() { util.isValidPath('').should.be.false; });

            ['abc', 'abc/', '/abc/', '//', '/?', '/', '/abc.png', '.', '/.png'].forEach(function(pathName) {
                it('is "' + pathName + '"', function() { util.isValidPath(pathName).should.be.false; })
            });
        });

        describe('should return true if pathName', function() {
            ['/abc', '/a'].forEach(function(pathName) {
                it('is "' + pathName + '"', function() { util.isValidPath(pathName).should.be.true; })
            });
        })
    })

    describe('isProduction()', function() {
        it('should return true if process.env.NODE_ENV is equal to "production"', function() {
            var cur = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            util.isProduction().should.be.true;
            process.env.NODE_ENV = cur;
        });

        it('should return false if process.env.NODE_ENV is not equal to "production"', function() {
            util.isProduction().should.be.false;
        });
    });

    describe('getShortKey(pathUrl)', function() {
        it('should return the pathname without the / of the given pathUrl', function() {
            var shortKey = 'abc';
            util.getShortKey('http://localhost/' + shortKey).should.equal(shortKey);
        });

        describe('should throw error if invalid pathUrl', function() {
            [undefined, '', 'abc', 'abc/', '/abc/', '//', '/?', '/', '/abc.png', '.', '/.png'].forEach(function(pathName) {
                var pathUrl = 'http://localhost:1337/' + pathName;
                it('"' + pathUrl+ '"', function() { 
                    (function() {
                        util.getShortKey(pathUrl).should.be.false;
                    }).should.throw;
                });

            });

            [undefined, '', 'abc', 'abc/', '/abc/', '//', '/?', '/', '/abc.png', '.', '/.png'].forEach(function(pathName) {
                it('"' + pathName + '"', function() {
                    (function() {
                        util.getShortKey(pathName).should.be.false;
                    }).should.throw;
                });
            });
        })
    })
});