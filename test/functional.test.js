var app = require('../app');
var should = require('should');
var request = require('superagent');
var inspect = require('util').inspect;

var util = app.util;
var db = require("mongojs").connect('testing_db', ['links']);

describe('functionally test server', function() {
    describe('Get Method with path', function() {
        it('"/" should return status 200', function(done) {
            request.get(util.getFullPath()).end(function(res) {
                res.should.exist;
                res.status.should.equal(200);
                res.text.should.equal('<h1>Shorten Long Url</h1><form action="/create" method="post"><div class="field required"><label for="id_long">Enter a long URL to shorten:</label><input type="text" name="long" id="id_long" /></div><div class="field"><label for="id_short">Custom url (optional):</label><input type="text" name="short" id="id_short" /></div><input type="submit" value="Shorten"/></form>');
                done();
            });
        });

        it('/hello should send 302 to static /helloworld page if shortUrl already exists', function(done) {
            var params = {short: 'hello', long: util.getFullPath('helloworld')};
            request.post(util.getFullPath('create'))
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(params).end(function() {
                request.get(util.getFullPath('hello')).end(function(res) {
                    res.should.exist;
                    res.status.should.equal(200);
                    res.text.should.equal('helloworld!');
                    done();
                });
            });
        });

        it('shortUrls that do not exist should return status 400', function(done) {
            request.get(util.getFullPath('a')).end(function(res) {
                res.should.exist;
                res.status.should.equal(400);
                res.text.should.equal("Error: No url associated with <b>http://localhost:1337/a</b></br><a href='http://localhost:1337/'>Go to Home Page</a>");
                done();
            });
        });
    });

    describe('Post Method with params', function() {

        afterEach(function(done) {
            db.links.remove(function(err) {
                if (err) should.fail('error cleaning database');
                done(err);
            });
        });

        it('{short: g, long: google.com} should save to db', function(done) {
            var params = {short: 'g', long: 'google.com'};
            request.post(util.getFullPath('create'))
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(params).end(function(res) {
                res.should.exist;
                res.status.should.equal(200);
                res.text.should.equal('<h1>Shorten URL Created!</h1><b>http://localhost:1337/g</b> now takes you to <b>http://google.com</b></br>Try now: <a href="http://localhost:1337/g">http://localhost:1337/g</a>');
                done();
            });
        });

        it('{short: "", long: google.com} should generate random shortUrl and save to db', function(done) {
            var params = {short: '', long: 'google.com'};
            request.post(util.getFullPath('create'))
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(params).end(function(res) {
                db.links.findOne({long: 'http://google.com'}, function(err, link) {
                    if (err || !link || !link.short) should.fail('error finding newly created shortUrl');
                    var shortKey = link.short;
                    res.should.exist;
                    res.status.should.equal(200);
                    res.text.should.startWith('<h1>Shorten URL Created!</h1><b>http://localhost:1337/' + shortKey);
                    done();
                });
            });
        });

        it('{short: "", long: google.com} should return existing generated random shortUrl if previously generated before', function(done) {
            var params = {short: '', long: 'google.com'};
            request.post(util.getFullPath('create'))
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(params).end(function(res) {
                request.post(util.getFullPath('create'))
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(params).end(function(res2) {
                    res2.should.exist;
                    res2.status.should.equal(200);
                    res2.text.should.equal(res.text);
                    done();
                });
            });
        });

        it('{short: g, long: google.com} should display error to db if shortUrl already exists', function(done) {
            var params = {short: 'g', long: 'google.com'};
            request.post(util.getFullPath('create'))
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send(params).end(function(res) {
                request.post(util.getFullPath('create'))
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(params).end(function(res2) {
                    res2.should.exist;
                    res2.status.should.equal(400);
                    res2.text.should.equal("Error: Custom url <b>http://localhost:1337/g</b> already exists.</br><a href='http://localhost:1337/'>Go to Home Page</a>");
                    done();
                });
            });
        });
    })
});