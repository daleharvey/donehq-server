#!/bin/bash -x

mkdir -p %SRC_DIR%/log
mkdir -p %SRC_DIR%/db

# Start Couch in the background, can tail -f for logs
%COUCH_START% -b -a %SRC_DIR%/conf/couchtasks.ini \
  -o %SRC_DIR%/log/couchdb.stdout \
  -e %SRC_DIR%/log/couchdb.stderr

# Dirty hack, I wanna wait until couch has started and
# accepting requests
sleep 3

# Setup the couchapp inside the master db, this is where everyone
# picks up their copy from
MASTER_URL=http://%ADMIN_NAME%:%ADMIN_PASS%@%COUCH_HOST%:%COUCH_PORT%/master
cd %SRC_DIR%/couchtasks

curl -X PUT $MASTER_URL
erica init
erica push $MASTER_URL

# Start application, will restart if any application files are changed
cd %SRC_DIR%/node-srv
nodemon app.js