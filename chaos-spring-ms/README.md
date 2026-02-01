# Chaos-Ready Spring Boot Microservice

A production-style Java 21 microservice project designed for chaos and resilience testing using Docker, Toxiproxy, and Pumba.

## Prerequisites
- Docker & Docker Compose
- Java 21 & Maven (for running tests from host)

## Repository Structure
- `service/`: Spring Boot 3.x microservice.
- `infra/`: Docker Compose and port orchestration.
- `toxiproxy/`: Network chaos proxy bootstrap.
- `wiremock/`: External API dependency simulator.
- `tests/`: Automated JUnit5 chaos test suite.

## How Ports are Chosen
The `infra/ports.sh` script automatically detects free ports on your host between 8000-9000 to avoid conflicts. These are written to `infra/.env.generated`.

## Getting Started

### 1. Start the Stack
```bash
./run.sh up
```
This will:
- Allocate free host ports.
- Start Postgres, Redis, WireMock, Toxiproxy, and the Microservice.
- Wait for all services to be healthy.
- Bootstrap Toxiproxy proxies.

### 2. Run Chaos Tests
```bash
./run.sh chaos
```
Executes the full suite of 10 chaos experiments (latency, timeouts, container kills, etc.) and automatically generates a premium **chaos_report.html**.

### 3. View Logs
```bash
./run.sh logs
```

### 4. Stop the Stack
```bash
./run.sh down
```
Only stops containers associated with this specific project (scoped by Docker Compose project name).

## Chaos Experiments
| ID | Experiment | Target | Expected Result |
|----|------------|--------|-----------------|
| E1 | DB Latency | Postgres | Request completes slower or hits pool timeout |
| E2 | DB Timeout | Postgres | Controlled 503/500 error |
| E3 | Redis Latency | Redis | GET item still works but is slower |
| E4 | Redis Cut | Redis | Service remains available (optional cache fallback) |
| E5 | Ext API Latency| WireMock | Resilience4j Circuit Breaker / Fallback triggered |
| E6 | Ext API 500 | WireMock | Fallback returned |
| E7 | Malformed JSON| WireMock | Graceful handling / Fallback returned |
| E8 | Pause Container| Postgres | Requests fail, then recover after unpause |
| E9 | Restart Redis | Redis | Automatic reconnection and recovery |
| E10| Kill Service | MS | Auto-restart and health recovery |
