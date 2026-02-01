#!/bin/bash

# Configuration
MAX_RETRIES=30
RETRY_INTERVAL=5

wait_for_service() {
  local service_name=$1
  local url=$2
  local retries=0

  echo "Waiting for ${service_name} at ${url}..."
  until curl -s -f "${url}" > /dev/null; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
      echo "${service_name} failed to become healthy after $((MAX_RETRIES * RETRY_INTERVAL)) seconds."
      return 1
    fi
    sleep $RETRY_INTERVAL
  done
  echo "${service_name} is healthy."
  return 0
}

# We can also use docker health status
wait_for_docker_health() {
  local container_name=$1
  local retries=0

  # Check if container has a healthcheck defined
  if [ "$(docker inspect -f '{{.State.Health}}' "${container_name}" 2>/dev/null)" == "<nil>" ]; then
    echo "Container ${container_name} has no healthcheck defined. Skipping health wait."
    return 0
  fi

  echo "Waiting for container ${container_name} health..."
  until [ "$(docker inspect -f '{{.State.Health.Status}}' "${container_name}" 2>/dev/null)" == "healthy" ]; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
      echo "Container ${container_name} failed to become healthy."
      return 1
    fi
    sleep $RETRY_INTERVAL
  done
  echo "Container ${container_name} is healthy."
  return 0
}

# The actual wait logic will be called by run.sh
