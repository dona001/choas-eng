# Runbook

## Debugging Failures
If a service is not healthy:
1. Check container logs: `./run.sh logs`
2. Check internal health endpoints:
   - MS: `curl http://localhost:$MS_PORT/actuator/health`
   - Wiremock: `curl http://localhost:$WIREMOCK_PORT/__admin/health`
   - Toxiproxy: `curl http://localhost:$TOXIPROXY_PORT/version`

## Inspecting Toxics
To see current toxics on a proxy:
```bash
curl http://localhost:$TOXIPROXY_PORT/proxies/db_proxy
```

## Resetting the Stack
If the stack gets into a bad state:
1. Stop everything: `./run.sh down`
2. Remove any orphaned volumes (optional): `docker volume prune`
3. Restart: `./run.sh up`

## Correlation IDs
Every log message in the microservice includes `[correlationId=...]`. 
- To trace a request across services:
  ```bash
  grep "correlation-id-uuid" logs/app.log
  ```
- Use the `X-Correlation-Id` header in your requests to set a custom ID.

## Resilience4j Monitoring
Actuator metrics for circuit breakers:
```bash
curl http://localhost:$MS_PORT/actuator/metrics/resilience4j.circuitbreaker.calls
```
