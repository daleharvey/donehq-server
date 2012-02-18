var config = {};
module.exports = config;

config.node = {
  host: '%NODE_HOST%',
  port: %NODE_PORT%
}


config.couch = {
  host: '%COUCH_HOST%',
  port: %COUCH_PORT%
};


config.couch.admin = {
  name: '%ADMIN_NAME%',
  pass: '%ADMIN_PASS%'
};