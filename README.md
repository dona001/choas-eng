# Chaos Engineering - Full-Stack Resilience Testing

A comprehensive chaos engineering implementation demonstrating **dual-layer resilience testing** across backend microservices and frontend applications.

## 🎯 Project Overview

This repository showcases production-grade chaos engineering practices for modern distributed systems:

- **Backend Chaos**: Spring Boot microservice with Toxiproxy, Pumba, and ExtentReports
- **Frontend Chaos**: Next.js application with Playwright network interception
- **Dual-Layer Strategy**: Fast unit tests + comprehensive integration tests

## 📁 Project Structure

```
choas-eng/
├── chaos-spring-ms/          # Backend microservice chaos testing
│   ├── service/              # Spring Boot application
│   ├── tests/                # JUnit 5 chaos test suite
│   ├── infra/                # Docker Compose infrastructure
│   ├── toxiproxy/            # Network chaos injection
│   ├── wiremock/             # API mocking
│   └── run.sh                # Automation script
│
└── chaos-frontend/           # Frontend application chaos testing
    ├── app/                  # Next.js 14 application
    ├── tests/                # Playwright chaos scenarios
    ├── playwright.config.ts  # Test configuration
    └── run-chaos.sh          # Automation script
```

## 🚀 Quick Start

### Backend Chaos Testing

```bash
cd chaos-spring-ms

# Start infrastructure (Postgres, Redis, Toxiproxy, WireMock)
./run.sh up

# Run chaos test suite (11 scenarios)
./run.sh chaos

# View detailed HTML report
open tests/chaos_report.html

# Cleanup
./run.sh down
```

### Frontend Chaos Testing

```bash
cd chaos-frontend

# Run all chaos scenarios
./run-chaos.sh

# Or manually:
npm install
npm run build
npx playwright test --reporter=html
npx playwright show-report
```

## 🧪 Test Scenarios

### Backend (11 Scenarios)

| Scenario | Type | Chaos Tool | Validates |
|----------|------|------------|-----------|
| **Scenario 0** | Baseline | None | Normal operation |
| **Scenario 1** | Network | Toxiproxy | Database latency handling |
| **Scenario 2** | Network | Toxiproxy | Database connection loss |
| **Scenario 3** | Network | Toxiproxy | Redis cache latency |
| **Scenario 4** | Network | Toxiproxy | Redis failover to DB |
| **Scenario 5** | Dependency | Toxiproxy | Circuit breaker activation |
| **Scenario 6** | Dependency | WireMock | Upstream 500 error handling |
| **Scenario 7** | Dependency | WireMock | Malformed JSON parsing |
| **Scenario 8** | Infrastructure | Pumba | Container pause recovery |
| **Scenario 9** | Infrastructure | Pumba | Component restart resilience |
| **Scenario 10** | Infrastructure | Pumba | Self-healing after crash |

**Results**: 11/11 Passed ✅ (70 seconds)

### Frontend (8 Scenarios)

#### Layer 1: Browser-Level Mocking (5 Tests)
- High Latency → Skeleton Loaders
- API 500 Error → Graceful Failure
- Network Timeout → Request Abortion
- Offline Mode → Connectivity Loss
- Partial Data → Empty Response

#### Layer 2: Full-Stack Integration (3 Tests)
- Real Backend Latency + UI Response
- Backend Outage + Error Boundary
- Flaky Network + Retry Logic

**Results**: 8/8 Passed ✅ (11 seconds)

## 🛠️ Technology Stack

### Backend
- **Runtime**: Java 21, Spring Boot 3.4
- **Database**: PostgreSQL (via Toxiproxy)
- **Cache**: Redis (via Toxiproxy)
- **Testing**: JUnit 5, RestAssured, Toxiproxy Java Client
- **Chaos Tools**: Toxiproxy, Pumba, WireMock
- **Reporting**: ExtentReports (HTML with dark theme)

### Frontend
- **Framework**: Next.js 14 (App Router), TypeScript
- **Styling**: Tailwind CSS (Dark mode, Glassmorphism)
- **Testing**: Playwright (Chromium)
- **Chaos Strategy**: Network interception via Playwright Route API
- **Reporting**: Playwright HTML Reporter

## 📊 Reports & Evidence

### Backend Report
![Backend Chaos Report](chaos-spring-ms/tests/chaos_report.html)

Features:
- **Request/Response Logging**: Full HTTP traffic capture
- **Expectations vs Actuals**: Clear pass/fail criteria
- **Categories**: Functional, Network, Dependency, Infrastructure
- **Dark Theme**: Professional ExtentReports dashboard

### Frontend Report
![Frontend Chaos Report](chaos-frontend/playwright-report/index.html)

Features:
- **Test Timeline**: Step-by-step execution traces
- **Screenshots**: Visual evidence of UI states
- **Console Logs**: Detailed assertion outputs
- **Dual-Layer Results**: Unit + Integration test separation

## 🎓 Key Learnings

### 1. Dual-Layer Testing Strategy
- **Unit Tests**: Fast feedback (11s), isolated failures
- **Integration Tests**: Real-world validation (70s), end-to-end confidence

### 2. Frontend Resilience Patterns
- **Skeleton Loaders**: Prevent blank screen during latency
- **Error Boundaries**: Catch and display friendly errors
- **Offline Handling**: Graceful degradation when disconnected

### 3. Backend Resilience Patterns
- **Circuit Breakers**: Resilience4j fallback mechanisms
- **Connection Pooling**: HikariCP timeout handling
- **Cache Fallback**: Redis → Database failover

### 4. Automation Best Practices
- **Single Command Execution**: `./run.sh chaos` for full suite
- **Deterministic Tests**: Mocked failures for stability
- **CI/CD Ready**: HTML reports for pipeline integration

## 🔗 Repository
**GitHub**: [https://github.com/dona001/choas-eng](https://github.com/dona001/choas-eng)

## 📝 Documentation
- [Backend Chaos Test Plan](chaos-spring-ms/CHAOS_TEST_PLAN.md)
- [Backend Execution Report](chaos-spring-ms/CHAOS_EXECUTION_REPORT.md)
- [Backend Runbook](chaos-spring-ms/RUNBOOK.md)
- [Frontend Chaos Report](chaos-frontend/FRONTEND_CHAOS_REPORT.md)

## 🎯 Next Steps
1. ✅ Backend chaos testing with ExtentReports
2. ✅ Frontend chaos testing with Playwright
3. 🔄 Connect frontend to real backend for E2E chaos
4. 🔄 Add advanced scenarios (CPU starvation, packet loss)
5. 🔄 Implement CI/CD pipeline with GitHub Actions

## 📜 License
MIT

---

**Built with ❤️ by a Principal Solution Engineer & Senior Full Stack Engineer**
