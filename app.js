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
});

// all environments
app.configure(function() {
    // handles static files in ./public files
    app.use('/static', express.static(__dirname + '/public')); 

    app.get('/', index);
    app.get('/favicon.ico', function(req, res) {res.send(200);});
    app.get('/*', handleGET);
    app.post('/create', handlePOST);
});

startServer();

function startServer() {
    db = require("mongojs").connect(databaseUrl, ['links']);
    app.listen(PORT);
    console.log(process.env.NODE_ENV + ' server running at http://' + HOSTNAME + ':' + PORT + "/");
}

function handleGET(req, res) {
    console.log("Received GET req: " + req.url);
    if (util.isValidPath(req.url)) {
        handleValidPaths(req, res);
    } else {
        sendErrorResponse(res, "Invalid short url");
    }
}

function index(req, res) {
    console.log('Get Request for Index');
    var create_form = forms.create({
        long: fields.string({required: true, label: 'Enter a long URL to shorten:'}),
        short: fields.string({required: false, label: 'Custom url (optional):'}) 
    });
    res.send('<h1>Shorten Long Url</h1>' +
        '<form action="/create" method="post">' + 
        create_form.toHTML() +
        '<input type="submit" value="Shorten"/>' +
        '</form>');
}

function handlePOST(req, res) {
    console.log("Received Post");
    var body = "";
    req.on('data', function(data) {
        body += data;
    });
    req.on('end', function() {
        var params = querystring.parse(body);
        var longUrl = params.long;
        var shortKey = params.short;
        console.log("shortkey: " + shortKey);
        switch(longUrl) {
            case undefined:
            case '':
            return sendErrorResponse(res, "Blank Long Url is not valid");
        }
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

function handleValidPaths(req, res) {
    console.log('Received Get');

    var pathUrl = req.url;
    console.log('Get Pathname: ' + pathUrl);

    var shortKey = util.getShortKey(pathUrl);
    console.log('ShortKey: ' + shortKey);

    db.links.findOne({short: shortKey}, function(err, link) {
        if (!err && link && link.long) {
            var longUrl = util.addHttpToUrlIfMissingProtocol(link.long);
            send302Response(res, longUrl);
        } else {
            sendErrorResponse(res, "No url associated with <b>" + util.getFullPath(shortKey) + "</b>");
        }
    });
}

util.isValidPath = function(pathName) {
    var regex = /^\/\w+$/;
    return regex.test(pathName);
}

util.getShortKey = function(pathUrl) {
    var parsedUrl = url.parse(pathUrl);
    return parsedUrl.pathname.substring(1);
}

function send302Response(res, forwardUrl) {
    console.log("FORWARD: " + forwardUrl);
    res.set({'Location': forwardUrl});
    res.send(302);
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