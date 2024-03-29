#!/bin/bash

# Safety
set -euxo pipefail

ZOOMIEBOT_PATH=/data/project/zoomiebot

cd $ZOOMIEBOT_PATH/project

GIT_HASH_OLD=`git rev-parse HEAD`

echo Updating project...

# Fetch latest
git fetch
# Clean all local changes
git reset --hard HEAD
# Pull the latest master commit
git pull

GIT_HASH=`git rev-parse --short HEAD`

echo Rebuilding...

# Download dependencies
npm ci

# Build both web and bot
npm run build

# Reload all Kubernetes configurations
for file in etc/k8s/*
do
  kubectl apply --validate=true -f "$file"
done

# Restart Zoomiebot
kubectl rollout restart deployment zoomiebot

echo Done! Deployed commit $GIT_HASH.

# Send email to maintainers
bash scripts/update-mail.sh $GIT_HASH_OLD | mail \
    -r tools.zoomiebot@toolforge.org \
    -s "New Zoomiebot version deployed [$GIT_HASH]" \
    "zoomiebot.maintainers@toolforge.org"
