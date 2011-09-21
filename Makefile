SRC_DIR=`pwd`

COUCH_START=couchdb

ADMIN_NAME=admin
ADMIN_PASS=password

COUCH_HOST=0.0.0.0
COUCH_PORT=6666

NODE_HOST=0.0.0.0
NODE_PORT=6667

all: cfg start_dev

clean:
	rm -rf db
	rm -rf log
	rm -f ./start_dev.sh
	rm -f ./conf/couchtasks.ini
	rm -f ./node-srv/config.js

cfg: couch_cfg node_cfg

start_dev:
	sed -e "s|%SRC_DIR%|$(SRC_DIR)|g" \
	    -e "s|%COUCH_START%|$(COUCH_START)|g" \
	    -e "s|%COUCH_HOST%|$(COUCH_HOST)|g" \
	    -e "s|%COUCH_PORT%|$(COUCH_PORT)|g" \
	    -e "s|%NODE_HOST%|$(NODE_HOST)|g" \
	    -e "s|%NODE_PORT%|$(NODE_PORT)|g" \
	    -e "s|%ADMIN_NAME%|$(ADMIN_NAME)|g" \
	    -e "s|%ADMIN_PASS%|$(ADMIN_PASS)|g" \
	<./start_dev.sh.tpl >./start_dev.sh
	chmod +x ./start_dev.sh

couch_cfg:
	sed -e "s|%SRC_DIR%|$(SRC_DIR)|g" \
	    -e "s|%COUCH_HOST%|$(COUCH_HOST)|g" \
	    -e "s|%COUCH_PORT%|$(COUCH_PORT)|g" \
	    -e "s|%NODE_HOST%|$(NODE_HOST)|g" \
	    -e "s|%NODE_PORT%|$(NODE_PORT)|g" \
	    -e "s|%ADMIN_NAME%|$(ADMIN_NAME)|g" \
	    -e "s|%ADMIN_PASS%|$(ADMIN_PASS)|g" \
	<./conf/couchtasks.ini.tpl >./conf/couchtasks.ini

node_cfg:
	sed -e "s|%SRC_DIR%|$(SRC_DIR)|g" \
	    -e "s|%COUCH_HOST%|$(COUCH_HOST)|g" \
	    -e "s|%COUCH_PORT%|$(COUCH_PORT)|g" \
	    -e "s|%NODE_HOST%|$(NODE_HOST)|g" \
	    -e "s|%NODE_PORT%|$(NODE_PORT)|g" \
	    -e "s|%ADMIN_NAME%|$(ADMIN_NAME)|g" \
	    -e "s|%ADMIN_PASS%|$(ADMIN_PASS)|g" \
	<./node-srv/config.js.tpl >./node-srv/config.js