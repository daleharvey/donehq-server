#!/bin/bash -x

%COUCH_START% -a %SRC_DIR%/conf/couchtasks.ini -d

cd %SRC_DIR%/node-srv
nodemon app.js