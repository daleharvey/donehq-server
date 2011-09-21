#!/bin/bash -x

mkdir -p %SRC_DIR%/log
mkdir -p %SRC_DIR%/db

%COUCH_START% -a %SRC_DIR%/conf/couchtasks.ini -d

cd %SRC_DIR%/node-srv
nodemon app.js