#!/bin/bash

error() {
    echo "$1" > /dev/stderr
    exit 0
}

return() {
    echo "$1"
}

set_default() {
    # docker initialized env variables with blank string and we can't just
    # use -z flag as usually.
    BLANK_STRING='""'
    VARIABLE="$1"
    DEFAULT="$2"
    if [[ -z "$VARIABLE" || "$VARIABLE" == "$BLANK_STRING" ]]; then
        if [ -z "$DEFAULT" ]; then
            error "You should specify default variable"
        else
            VARIABLE="$DEFAULT"
        fi
    fi
   return "$VARIABLE"
}

function log() {
	$ECHO "`date`: $@"
}

ECHO="/bin/echo"
INSTALL_PATH="$APP/cexplorer/"

WAIT_SECONDS=$(set_default "$WAIT_SECONDS" 5)
DB_HOST=$(set_default "$DB_HOST" "mongodb")
DB_PORT=$(set_default "$DB_PORT" "27017")

SERVER="$DB_HOST:$DB_PORT"

log "Check MongoDB ($SERVER) status"

until $ECHO 'db.stats().ok' | mongo $SERVER --quiet >/dev/null; do
	log "Waiting $WAIT_SECONDS seconds to retry..."
	sleep $WAIT_SECONDS
done

log "Start cexplorer service"
npm start --prefix $INSTALL_PATH
