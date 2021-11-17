#!/usr/bin/env sh
set -e

$HOME=~

# Setup environment
source "$HOME/.profile"
cd "$HOME/project/"

# Run task
npm run "run:$1"

set +e