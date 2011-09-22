[couchdb]
database_dir = %SRC_DIR%/db
view_index_dir = %SRC_DIR%/db
uri_file = %SRC_DIR%/db/couch.uri

[couch_httpd_auth]
timeout = 43200

[httpd]
bind_address = %COUCH_HOST%
port = %COUCH_PORT%

[log]
level = debug
file = %SRC_DIR%/log/couch.log

[access_log]
file = %SRC_DIR%/log/couch_access.log

[admin]
%ADMIN_NAME%=%ADMIN_PASS%