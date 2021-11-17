#!/usr/bin/env sh
set -e

# Absolute path to this script, e.g. /home/user/bin/foo.sh
SCRIPT=$(readlink -f "$0")
# Absolute path this script is in, thus /home/user/bin
    SCRIPT_PATH=$(dirname "$SCRIPT")

export HOME=`getent passwd $USER | cut -d: -f6`
/usr/bin/jsub \
    -N "$1" \
    -o "$HOME/logs/$1.out" \
    -e "$HOME/logs/$1.err" \
    -quiet -once -mem 1024m \
    "$SCRIPT_PATH/one-off.sh" "$1"

if [ -t 1 ]; then
    tail -Fqn 0 "$HOME/logs/$1.err" "$HOME/logs/$1.out"
fi

set +e
