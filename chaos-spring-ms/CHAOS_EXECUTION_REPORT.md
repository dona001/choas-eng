# Chaos Execution Report

**Date**: 2026-01-30  
**Status**: 🟢 ALL TESTS PASSED (11/11)  
**Microservice**: `chaos-spring-ms` (v1.0.0)

## Summary Table

| ID | Scenario | Expected Result | Actual Result | Verdict |
|----|----------|-----------------|---------------|---------|
| -- | Baseline | 200 OK | 200 OK (Clean state) | ✅ PASS |
| E1 | DB Latency | Request completes > 1000ms | 200 OK (Took 3113ms) | ✅ PASS |
| E2 | DB Timeout | 503/500 Error within timeout | 500 Error (Connection Cut) | ✅ PASS |
| E3 | Redis Latency| Redis fetch > 500ms | 200 OK (Took 585ms) | ✅ PASS |
| E4 | Redis Cut | Fallback / Graceful failure | 200 OK (DB Fallback) | ✅ PASS |
| E5 | API Latency | Circuit Breaker / Fallback | 200 OK (Fallback triggered) | ✅ PASS |
| E6 | API 500 | Fallback triggered | 200 OK (Fallback triggered) | ✅ PASS |
| E7 | API Malformed| Graceful handling / Fallback | 200 OK (Fallback triggered) | ✅ PASS |
| E8 | DB Pause | Timeout then recovery | 500 Error -> Recovery | ✅ PASS |
| E9 | Redis Restart| Auto-reconnection | 200 OK (Reconnected) | ✅ PASS |
| E10| Service Kill | Pod/Container Auto-restart | 200 OK (Service Restored) | ✅ PASS |

---

## Detailed Observations

### 1. Database & Cache Resilience (E1 - E4)
- **Latency Handling**: When 1000ms latency was injected into the DB, the service correctly waited and eventually responded. The total request time was ~3.1s, indicating some overhead or consecutive queries.
- **Connectivity Loss**: Cutting the DB proxy immediately resulted in a 500 error as expected (no fallback defined for initial data fetch).
- **Redis Fallback**: When Redis was cut, the application successfully fell back to direct database queries, ensuring no downtime for the end-user.

### 2. Upstream Resilience (E5 - E7)
- **Circuit Breaker**: The Resilience4j `TimeLimiter` successfully timed out the 3000ms delayed external API call.
- **Fail-Fast**: Upstream 500 and malformed JSON responses were caught and replaced with the pre-defined fallback response ("Service Unavailable" mock data), preventing upstream garbage from breaking the downstream service.

### 3. Infrastructure Stability (E8 - E10)
- **Container Pause**: Pausing Postgres caused immediate timeouts. Once Pumba unpaused the container, the connection pool (Hikari) recovered immediately without requiring a service restart.
- **Auto-Restart**: Killing the microservice container triggered the Docker `restart: always` policy. The service came back online and was healthy within 15 seconds.

---

## Conclusion
The `chaos-spring-ms` microservice demonstrates **strong resilience** against network instability and dependency failures. The recovery from infrastructure-level crashes is handled effectively by the container runtime.

**Recommendations**:
- Optimization: The DB latency overhead (3.1s for 1s injection) suggests sequential queries that could be optimized.
- Monitoring: Ensure Prometheus alerts are fired for Circuit Breaker state changes.
