'use strict';

var http = require('http');
var url = require('url');
var querystring = require('querystring');
var os = require('os');

// Third-Party
var db, databaseUrl;
var forms = require('forms'),
    fields = forms.fields,
    validators = forms.validators;
var random = require("randomstring");
var express = require('express'),
    app = express();


// GLOBAL DB KEYS
var HOSTNAME, PORT;

var util = {};

module.exports.util = util;

// dev env
app.configure('development', function() {
    databaseUrl = 'mydb';
    HOSTNAME = exports.HOSTNAME = 'http://localhost';
    PORT = exports.PORT = 1337;
});

// testing env
app.configure('testing', function() {
    databaseUrl = 'testing_db';
    app.get('/helloworld', function(req, res) { res.send('helloworld!') }); // used by one of the tests
    HOSTNAME = exports.HOSTNAME = 'http://localhost';
    PORT = exports.PORT = 1337;
});

// production env
app.configure('production', function() {
    databaseUrl = process.env.MONGOLAB_URI;
    HOSTNAME = exports.HOSTNAME = process.env.HOSTNAME;
    PORT = exports.PORT = process.env.PORT;
    app.set('src_angular_js', '//netdna.bootstrapcdn.com/bootstrap/3.0.0/js/bootstrap.min.js');
});

// all environments
app.configure(function() {
    // log all routes
    app.use(express.logger());

    // favicon
    app.use(express.favicon(__dirname + '/public/rocket.ico'));

    // configure views
    app.set("views", __dirname + "/views"); 
    app.engine('html', require('ejs').renderFile);

    // handles static files in ./public files
    app.use('/static', express.static(__dirname + '/public')); 
    app.use('/static', express.static(__dirname + '/bower_components/')); 

    // app routes
    app.get('/', index);
    app.get('/favicon.ico', function(req, res) {res.send(200);});
    app.get(/^\/\w+$/, handleGET);
    app.get('*', function(req, res) { sendErrorResponse(res, "Invalid short url") });
    app.post('/create', handlePOST);

    app.locals({
        title: 'Shorten Long Url',
        src_angular_js: app.get('js_src') || '/static/angular/angular.js'
    });
});

startServer();

function startServer() {
    db = require("mongojs").connect(databaseUrl, ['links']);
    app.listen(PORT);
    console.log(process.env.NODE_ENV + ' server running at http://' + HOSTNAME + ':' + PORT + "/");
}

function handleGET(req, res) {
    var pathUrl = req.url;

    var shortKey = util.getShortKey(pathUrl);

    db.links.findOne({short: shortKey}, function(err, link) {
        if (!err && link && link.long) {
            var longUrl = util.addHttpToUrlIfMissingProtocol(link.long);
            sendRedirect(res, longUrl);
        } else {
            sendErrorResponse(res, "No url associated with <b>" + util.getFullPath(shortKey) + "</b>");
        }
    });
}

function index(req, res) {
    res.render('index.html.ejs', {message : 'hello'});
    // var create_form = forms.create({
    //     long: fields.string({required: true, label: 'Enter a long URL to shorten:'}),
    //     short: fields.string({required: false, label: 'Custom url (optional):'}) 
    // });
    // res.send('<h1>Shorten Long Url</h1>' +
    //     '<form action="/create" method="post">' + 
    //     create_form.toHTML() +
    //     '<input type="submit" value="Shorten"/>' +
    //     '</form>');
}

function handlePOST(req, res) {
    var body = "";
    req.on('data', function(data) {
        body += data;
    });
    req.on('end', function() {
        console.log(body);
        var params = JSON.parse(body);
        var longUrl = params.long;
        var shortKey = params.short;
        console.log("shortkey: " + shortKey + " longUrl: " + longUrl);
        if (longUrl == undefined || longUrl == '')
            return sendErrorResponse(res, "Blank Long Url is not valid");
        switch(shortKey) {
            case undefined: return sendErrorResponse(res, "Error has occured");

            case '': return handleBlankShortKey(res, params);

            default: {
                if (!util.isValidPath("/" + shortKey)) 
                    return sendErrorResponse(res, "Invalid shorten URL: " + shortKey);
                return handleShortKeyLookup(res, params);
            }
        }
    })
}

function handleBlankShortKey(res, params) {
    delete(params.short);
    params.generated = true;
    params.long = util.addHttpToUrlIfMissingProtocol(params.long);
    db.links.findOne(params, function(err, link) {
        if (!err && link && link.long) {
            console.log("random generated custom url already exists so reusing: " + util.getFullPath(link.short));
            params.short = link.short;
            return renderShortenUrlCreated(res, params);
        } else {
            params.short = random.generate(4);
            console.log("randomly generated " + params.short + " for shorten url");
            params.generated = true;
            return handleShortKeyLookup(res, params);
        }
    });
}

function handleShortKeyLookup(res, params) {
    var longUrl = params.long;
    var shortKey = params.short;
    db.links.findOne({short: shortKey}, function(err, link) {
        if (!err && link && link.long) {
            return sendErrorResponse(res, "Custom url <b>" + util.getFullPath(shortKey) + "</b> already exists.");
        } else {
            return createNewShortUrl(res, params);
        }
    });
}

function createNewShortUrl(res, params) {
    var shortKey = params.short;
    console.log("short url not taken: " + shortKey);
    params.long = util.addHttpToUrlIfMissingProtocol(params.long);
    db.links.save(params, function(err, saved) {
        if( err || !saved ) {
            sendErrorResponse(res, "Error has occured. Please try again.");
        } else {
            renderShortenUrlCreated(res, params);
        }
    });
}

function renderShortenUrlCreated(res, params) {
    var longUrl = params.long;
    var shortKey = params.short;
    res.send('<h1>Shorten URL Created!</h1>'+
        '<b>' + util.getFullPath(shortKey) + '</b> now takes you to <b>' + longUrl + '</b></br>' +
        'Try now: ' + '<a href="' + util.getFullPath(shortKey) + '">'+ util.getFullPath(shortKey) + "</a>");
}

util.isValidPath = function(pathName) {
    var regex = /^\/\w+$/;
    return regex.test(pathName);
}

util.getShortKey = function(pathUrl) {
    var parsedUrl = url.parse(pathUrl);
    return parsedUrl.pathname.substring(1);
}

function sendRedirect(res, forwardUrl) {
    console.log("FORWARD: " + forwardUrl);
    res.redirect(forwardUrl);
}

function sendErrorResponse(res, msg) {
    if (msg)
        msg = 'Error: ' + msg;
    else
        msg = 'Error';
    msg = msg + "</br><a href='" + util.getFullPath() + "'>Go to Home Page</a>";
    res.send(400, msg);
    console.log("send error: " + msg);
}

util.addHttpToUrlIfMissingProtocol = function(longUrl) {
    if (longUrl == undefined || longUrl == '') throw new Error("longUrl can't be undefined or empty");
    if (url.parse(longUrl).protocol == undefined) {
        return "http://".concat(longUrl);
    }
    return longUrl;
}

util.getFullPath = function(shortKey) {
    if (shortKey == undefined) shortKey = '';
    if (util.isProduction()) {
        return HOSTNAME + "/" + shortKey;
    }
    return HOSTNAME + ":" + PORT + "/" + shortKey; 
}

util.isProduction = function() {
    return process.env.NODE_ENV == 'production';
}