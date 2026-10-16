#!/bin/sh
# Runs schema.sql on a scratch database and checks the access rules.
# Needs a local Postgres; pass psql connection flags, e.g.:  sh run.sh -h /var/run/postgresql -U postgres
set -e
here=$(dirname "$0")
psql "$@" -q -v ON_ERROR_STOP=1 -c "drop database if exists wt_test" -c "create database wt_test"
psql "$@" -q -v ON_ERROR_STOP=1 -d wt_test -f "$here/stub.sql" 2>&1 | grep -v -i -E "wal_level|HINT" || true
psql "$@" -q -v ON_ERROR_STOP=1 -d wt_test -f "$here/../schema.sql" 2>/dev/null
psql "$@" -q -v ON_ERROR_STOP=1 -d wt_test -f "$here/../schema.sql" 2>/dev/null   # safe to run twice
psql "$@" -q -v ON_ERROR_STOP=1 -d wt_test -f "$here/rules.sql" 2>&1 | sed -n 's/.*NOTICE:  //p; s/.*ERROR:  //p'
psql "$@" -q -c "drop database wt_test"
