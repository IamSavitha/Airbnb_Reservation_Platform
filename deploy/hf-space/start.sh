#!/usr/bin/env bash
# Start MongoDB, load demo data, then run the API (which also serves the React build).
set -euo pipefail

mkdir -p /tmp/mongo
mongod --dbpath /tmp/mongo --bind_ip 127.0.0.1 --port 27017 --fork --logpath /tmp/mongod.log

# Fresh secrets per container start unless provided as Space secrets.
export JWT_SECRET="${JWT_SECRET:-$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')}"
export SESSION_SECRET="${SESSION_SECRET:-$JWT_SECRET}"

cd /app/backend
node scripts/seed.js
exec node server.js
