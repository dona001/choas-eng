#!/bin/bash

# Configuration
PORT_START=8000
PORT_END=9000
ENV_FILE="infra/.env.generated"

# Function to check if a port is in use
is_port_in_use() {
  lsof -i :"$1" > /dev/null 2>&1
}

# Function to find a free port
find_free_port() {
  local port=$1
  while [ $port -le $PORT_END ]; do
    if ! is_port_in_use "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done
  return 1
}

echo "# Generated at $(date)" > "$ENV_FILE"

# MS_PORT
MS_PORT=$(find_free_port $PORT_START)
echo "MS_PORT=$MS_PORT" >> "$ENV_FILE"
echo "Allocated MS_PORT: $MS_PORT"

# TOXIPROXY_PORT
TOXIPROXY_PORT=$(find_free_port $((MS_PORT + 1)))
echo "TOXIPROXY_PORT=$TOXIPROXY_PORT" >> "$ENV_FILE"
echo "Allocated TOXIPROXY_PORT: $TOXIPROXY_PORT"

# WIREMOCK_PORT
WIREMOCK_PORT=$(find_free_port $((TOXIPROXY_PORT + 1)))
echo "WIREMOCK_PORT=$WIREMOCK_PORT" >> "$ENV_FILE"
echo "Allocated WIREMOCK_PORT: $WIREMOCK_PORT"

# Export these for the current session if needed
# source infra/.env.generated
