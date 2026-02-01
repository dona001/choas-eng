#!/bin/bash

# This script assumes toxiproxy-cli is available or we use curl
# Since we are running in docker or host, let's use CURL to the TOXIPROXY_PORT

TOXIPROXY_HOST=${TOXIPROXY_HOST:-localhost}
TOXIPROXY_URL="http://${TOXIPROXY_HOST}:${TOXIPROXY_PORT:-8474}"

echo "Initializing Toxiproxy at ${TOXIPROXY_URL}..."

# Wait for toxiproxy to be ready
until curl -s "${TOXIPROXY_URL}/version" > /dev/null; do
  echo "Waiting for Toxiproxy..."
  sleep 1
done

create_proxy() {
  local name=$1
  local listen=$2
  local upstream=$3

  echo "Creating proxy ${name} (${listen} -> ${upstream})"
  curl -s -X POST "${TOXIPROXY_URL}/proxies" \
    -d "{\"name\": \"${name}\", \"listen\": \"${listen}\", \"upstream\": \"${upstream}\"}"
}

# Proxies within the Docker network
create_proxy "db_proxy" "0.0.0.0:15432" "postgres:5432"
create_proxy "redis_proxy" "0.0.0.0:16379" "redis:6379"
create_proxy "ext_proxy" "0.0.0.0:18080" "wiremock:8080"

echo "Toxiproxy initialized."
