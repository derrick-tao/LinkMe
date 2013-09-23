'use strict';

var http = require('http');
var url = require('url');
var querystring = require('querystring');
var os = require('os');

// Third-Party
var databaseUrl = process.env.MONGOLAB_URI || "mydb",
    collections = ["links"],
    db;
var forms = require('forms'),
    fields = forms.fields,
    validators = forms.validators;
var random = require("randomstring");
var express = require('express'),
    app = express();


// GLOBAL DB KEYS
var HOSTNAME = exports.HOSTNAME = process.env.HOSTNAME || 'http://localhost';
var PORT = exports.PORT = process.env.PORT || 1337;

var util = {};

module.exports.util = util;

app.get('/', index);
app.get('/favicon.ico', function(req, res) {res.writeHead(200); res.end();});
app.post('/create', handlePOST);

app.use(express.logger());

startServer();

function startServer() {
    if(process.env.NODE_ENV == 'testing') {
        databaseUrl = 'testing_db';
        app.get('/helloworld', function(req, res) { res.writeHead(200, {'Content-Type': 'text/html'}); res.end('helloworld!') });
    }
    db = require("mongojs").connect(databaseUrl, collections);
    app.get('/*', handleGET);
    app.listen(PORT);
    console.log('Server running at http://' + HOSTNAME + ':' + PORT + "/");
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
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>Shorten Long Url</h1>');
    res.end(
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
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>Shorten URL Created!</h1>');
    res.write('<b>' + util.getFullPath(shortKey) + '</b> now takes you to <b>' + longUrl + '</b></br>');
    res.write('Try now: ' + '<a href="' + util.getFullPath(shortKey) + '">'+ util.getFullPath(shortKey) + "</a>");
    return res.end();
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
    res.writeHead(302, {'Location': forwardUrl});
    res.end();
    return res;
}

function sendErrorResponse(res, msg) {
    res.writeHead(400,  {'Content-Type': 'text/html'});
    if (msg)
        msg = 'Error: ' + msg;
    else
        msg = 'Error';
    res.write(msg + "</br>");
    console.log("send error: " + msg);
    res.end("<a href='" + util.getFullPath() + "'>Go to Home Page</a>");
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