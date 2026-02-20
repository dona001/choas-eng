#!/bin/bash

# Configuration
PROJECT_NAME="chaos-spring-ms"
COMPOSE_FILE="infra/docker-compose.yml"
GEN_ENV="infra/.env.generated"
TEMPLATE_ENV="infra/.env.template"

set -e

# Load helper
source infra/wait-for-health.sh

case "$1" in
  up)
    echo "Allocating ports..."
    ./infra/ports.sh
    
    # Merge template for defaults
    echo "# Defaults" >> "$GEN_ENV"
    cat "$TEMPLATE_ENV" >> "$GEN_ENV"

    echo "Starting infrastructure..."
    docker compose -p "$PROJECT_NAME" --env-file "$GEN_ENV" -f "$COMPOSE_FILE" up -d --build postgres redis wiremock toxiproxy pumba

    # Wait for core infra
    wait_for_docker_health "chaos-postgres"
    wait_for_docker_health "chaos-redis"
    wait_for_docker_health "chaos-wiremock"
    wait_for_docker_health "chaos-toxiproxy"

    # Initialize Toxiproxy
    source "$GEN_ENV"
    TOXIPROXY_PORT=$TOXIPROXY_PORT ./toxiproxy/bootstrap.sh

    echo "Starting microservice..."
    docker compose -p "$PROJECT_NAME" --env-file "$GEN_ENV" -f "$COMPOSE_FILE" up -d --build ms

    # Wait for MS (might be slower due to build)
    wait_for_docker_health "chaos-ms"

    echo "===================================================="
    echo " STACK IS UP AND HEALTHY"
    echo "===================================================="
    echo " Microservice: http://localhost:$MS_PORT"
    echo " Toxiproxy:    http://localhost:$TOXIPROXY_PORT"
    echo " WireMock:     http://localhost:$WIREMOCK_PORT"
    echo "===================================================="
    ;;

  chaos)
    if [ ! -f "$GEN_ENV" ]; then
      echo "Stack is not up. Run ./run.sh up first."
      exit 1
    fi
    source "$GEN_ENV"
    echo "Ensuring clean microservice state..."
    docker compose -p "$PROJECT_NAME" --env-file "$GEN_ENV" -f "$COMPOSE_FILE" restart ms
    wait_for_docker_health "chaos-ms"

    echo "Running chaos tests..."
    export MS_URL="http://localhost:$MS_PORT"
    export TOXIPROXY_URL="http://localhost:$TOXIPROXY_PORT"
    export WIREMOCK_URL="http://localhost:$WIREMOCK_PORT"
    mvn -f tests/pom.xml clean test
    
    echo "Done! Report available at: tests/chaos_report.html"
    ;;

  down)
    echo "Stopping stack..."
    docker compose -p "$PROJECT_NAME" down --remove-orphans
    ;;

  logs)
    docker compose -p "$PROJECT_NAME" logs -f
    ;;

  *)
    echo "Usage: ./run.sh {up|chaos|down|logs}"
    exit 1
    ;;
esac
