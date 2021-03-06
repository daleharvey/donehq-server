var config = require('./config');
var http = require('http');
var request = require('request');
var hashlib = require("hashlib");
var _ = require('underscore');

var couchAuthUrl = 'http://' + config.couch.admin.name + ':' +
  config.couch.admin.pass + '@' + config.couch.host + ':' + config.couch.port;

var couchUrl = 'http://' + config.couch.host + ':' + config.couch.port + '/';

var nano = require('nano')(couchAuthUrl);
var app = require('express').createServer();


// Homepage!
app.get('/', function(_, res) {
  res.sendfile(__dirname + '/public/index.html');
});


// Serves the main application index.html, this path needs a check
// for auth errrors to give the user a login screen if they arent
// logged in
app.get('/user/:id/', function(req, res){

  var url = couchUrl + req.params.id + '/_design/couchtasks/index.html';

  request.get({
    headers: {'Cookie': req.headers['cookie'] || ''},
    uri: url
  }, function(err, resp, body) {
    if (resp.statusCode === 401) {
      res.sendfile(__dirname + '/public/index.html');
    } else {
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(body + '\n');
    }
  });
});


// CouchApp addresses everything relatively from root, so this ust proxies
// the static file requests
app.get('/user/:id/*', function(req, res) {
  var url = couchUrl + req.params.id + '/_design/couchtasks/' + req.params[0];
  var x = request(url);
  req.pipe(x);
  x.pipe(res);
});


// Proxy all requests from /couch/* to the root of the couch host
app.all('/couch/*', function(req, res) {
  var url = couchUrl + req.url.slice(7);
  var x = request(url);
  req.pipe(x);
  x.pipe(res);
});


// Proxy login requests to couch
app.post('/login', function(req, client) {
  fetchJSONBody(req, function(post) {
    loginRequest(post.user, post.password, function(err, res, body) {
      if (res.statusCode === 401) {
        reply(client, 401, {error: 'invalid login'});
      } else {
        reply(client, 200, {ok: true}, {'Set-Cookie': res.headers['set-cookie']});
      }
    });
  });
});


// Register a user, check their name isnt taken and if not, create a new
// user, create a database for them and setup security + initial CouchApp
// This needs retry mechanisms built in, other failures are transient but if
// this fails then it can be left inconsistent
app.post('/register', function(req, client) {

  fetchJSONBody(req, function(post) {

    console.log('REGISTRATION: ' + post.user);

    var users = nano.use('_users');
    var name = post.user;
    var userName = 'org.couchdb.user:' + post.user;

    areValidCredentials(users, userName, post, function(areValid, reason) {

      if (!areValid) {
        reply(client, reason.status, reason.json);

      } else {
        createUserDoc(userName, name, post.password, function(user_doc) {

          users.insert(user_doc, function(err, body, hdrs) {

            if (err) {
              reply(client, 503, {error: 'unknown'});
              return;
            }

            loginRequest(post.user, post.password, function(error, res, body) {
              createAccount(name, post.init_ui, function() {
                reply(client, 201, {ok: true}, {
                  'Set-Cookie': res.headers['set-cookie']
                });
              });
            });
          });
        });
      }
    });
  });
});


app.get('*', function(req, res) {
  res.sendfile(__dirname + '/public' + req.params[0]);
});


function areValidCredentials(usersTable, id, post, callback) {

  if (post.password !== post.confirm_password) {
    callback(false, {status: 400, json: {error: 'Passwords do not match'}});

  } else if (!/^[A-Za-z0-9_]{3,20}$/.test(post.user)) {
    callback(false, {status: 400, json: {
      error: 'Invalid username'
    }});

  } else if (!/^[A-Za-z0-9_]{3,20}$/.test(post.password)) {
    callback(false, {status: 400, json: {
      error: 'Invalid password'
    }});

  } else {
    usersTable.get(id, function(err, _, res) {
      if (res['status-code'] === 200) {
        callback(false, {status: 409, json: {error: 'Username is in use'}});
      } else {
        callback(true);
      }
    });
  }
}


function reply(client, status, content, hdrs) {
  var headers = _.extend({'Content-Type': 'application/json'}, hdrs);
  client.writeHead(status, headers);
  client.end(JSON.stringify(content));
}

function createUserDoc(id, name, password, callback) {
  nano.request({db: "_uuids"}, function(_, uuids){
    var salt = uuids.uuids[0];
    callback({
      _id: id,
      name: name,
      type: 'user',
      roles: [],
      salt: salt,
      password_sha: hashlib.sha1(password + salt)
    });
  });
}


function loginRequest(username, password, callback) {
  request({
    method: 'POST',
    uri: couchUrl + '_session',
    body: 'name=' + username + '&password=' + password,
    headers: {'content-type': 'application/x-www-form-urlencoded' }
  }, callback);
}


// Cant use parseBody middleware because it kills streams that are needed to
function fetchJSONBody(req, callback) {
  var content = '';
  req.addListener('data', function(data) {
    content += data;
  });
  req.addListener('end', function() {
    callback(JSON.parse(content));
  });
}


// Ensure the users database exists and has the correct
// security credentials
function createAccount(name, initUI, callback) {

  nano.db.create(name, function (error, body, headers) {

    if (headers['status-code'] === 201 ||
        headers['status-code'] === 412) {

      var doSecurity = function() {

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

      };

      if (initUI === true) {
        nano.db.replicate('master', name, doSecurity);
      } else {
        doSecurity();
      }

    } else {
      if (callback) {
        callback();
      }
    }
  });
}


app.listen(config.node.port);
console.log('Server running at http://' + config.node.host + ':' + config.node.port);