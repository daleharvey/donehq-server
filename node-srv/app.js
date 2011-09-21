var config = require('./config');
var http = require('http');
var request = require('request');
var express = require('express');
var hashlib = require("hashlib");
var httpProxy = require('http-proxy');

var couchUrl = 'http://' + config.couch.admin.name + ':' + config.couch.admin.pass
  + '@' + config.couch.host + ':' + config.couch.port;

var nano = require('nano')(couchUrl);

var app = require('express').createServer();


app.get('/', function(_, res) {
  res.sendfile(__dirname + '/public/index.html');
});


app.get('/user/:id/', function(req, res){

  var url = 'http://' + config.couch.host + ':' + config.couch.port +
    '/' + req.params.id + '/_design/couchtasks/index.html';

  request.get({
    headers: {'Cookie': req.headers['cookie'] || ''},
    uri: url
  }, function(err, resp, body) {
    if (resp.statusCode === 401) {
      res.sendfile(__dirname + '/public/index.html');
    } else {
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      res.end(body + '\n');
    }
  });
});


app.get('/user/:id/*', function(req, res) {
  var url = 'http://' + config.couch.host + ':' + config.couch.port + '/' +
    req.params.id + '/_design/couchtasks/' + req.params[0];
  var x = request(url);
  req.pipe(x);
  x.pipe(res);
});


app.all('/couch/*', function(req, res) {
  var url = 'http://' + config.couch.host + ':' + config.couch.port
    + req.url.slice(6);
  var x = request(url);
  req.pipe(x);
  x.pipe(res);
});


app.post('/login', function(req, client) {

  fetchBody(req, function(content) {
    req.body = JSON.parse(content);
    request({
      method: 'POST',
      uri: 'http://' + config.couch.host + ':' + config.couch.port + '/_session',
      body: 'name=' + req.body.user + '&password=' + req.body.password,
      headers: {'content-type': 'application/x-www-form-urlencoded' }
    }, function(error, res, body) {

      if (res.statusCode === 401) {
        client.writeHead(401, {'Content-Type': 'text/plain'});
        client.end('denied\n');
      } else {
        client.writeHead(200, {
          'Content-Type': 'text/plain',
          'Set-Cookie': res.headers['set-cookie']
        });
        client.end('yay\n');

        ensureAccount(req.body.user);
      }
    });
  });

});


app.post('/register', function(req, client) {

  fetchBody(req, function(content) {
    req.body = JSON.parse(content);
    console.log(req.body);
    var users = nano.use('_users');
    var name = req.body.user;
    var userName = 'org.couchdb.user:' + req.body.user;

    users.get(userName, function(err, _, res) {

      if (res['status-code'] === 404) {

        nano.request({db: "_uuids"}, function(_, uuids){

          var salt = uuids.uuids[0];
          var user_doc = {
            _id: userName,
            name: name,
            type: 'user',
            roles: [],
            salt: salt,
            password_sha: hashlib.sha1(req.body.password + salt)
          };

          users.insert(user_doc, function(err, body, hdrs) {
            if (err) {
              client.writeHead(503, {'Content-Type': 'text/plain'});
              client.end('wtf\n');
              return;
            }

            request({
              method: 'POST',
              uri: 'http://' + config.couch.host + ':' + config.couch.port + '/_session',
              body: 'name=' + req.body.user + '&password=' + req.body.password,
              headers: {'content-type': 'application/x-www-form-urlencoded' }
            }, function(error, res, body) {
              ensureAccount(name, function() {
                client.writeHead(201, {
                  'Content-Type': 'text/plain',
                  'Set-Cookie': res.headers['set-cookie']
                });
                client.end('Created!\n');
              });
            });
          });
        });
      } else if (res['status-code'] === 200) {
        client.writeHead(409, {'Content-Type': 'text/plain'});
        client.end('conflict\n');
      }
    });
  });

});


app.get('*', function(req, res) {
  res.sendfile(__dirname + '/public' + req.params[0]);
});


function fetchBody(req, callback) {
  var content = '';
  req.addListener('data', function(data) {
    content += data;
  });
  req.addListener('end', function() {
    callback(content);
  });
}


function ensureAccount(name, callback) {

  nano.db.create(name, function (error, body, headers) {

    if (headers['status-code'] === 201 ||
        headers['status-code'] === 412) {

      var security = {
        admins: { names: [name], roles: []},
        readers: { names: [name], roles: []}
      };

      nano.request({
        method: 'PUT',
        db: name,
        path: '_security',
        body: security
      }, function(err, body, hdrs) {
        if (hdrs['status-code'] !== 200) {
          throw(err);
        }
        if (callback) {
          callback();
        }
      });
    } else {
      if (callback) {
        callback();
      }
    }

  });
}

app.listen(config.node.port);
console.log('Server running at http://' + config.node.host + ':' + config.node.port);