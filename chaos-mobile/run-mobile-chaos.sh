#!/bin/bash

# ============================================================
# Mobile Chaos Engineering - Automation Script
# ============================================================
# Usage:
#   ./run-mobile-chaos.sh build     # Build iOS app for simulator
#   ./run-mobile-chaos.sh layer1    # Run Layer 1 (App-Level Chaos)
#   ./run-mobile-chaos.sh layer2    # Run Layer 2 (Integration Chaos)
#   ./run-mobile-chaos.sh layer3    # Run Layer 3 (Mobile-Specific Chaos)
#   ./run-mobile-chaos.sh all       # Run ALL chaos layers
#   ./run-mobile-chaos.sh sim       # List available iOS simulators
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/../chaos-spring-ms"
DETOX_CONFIG="ios.sim.release"
STATE_FILE="$PROJECT_DIR/e2e/reports/.test-state.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    if ! command -v xcrun &> /dev/null; then
        print_error "xcrun not found. Install Xcode Command Line Tools."
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        print_error "npx not found. Install Node.js."
        exit 1
    fi

    # Check if a simulator is booted
    local booted=$(xcrun simctl list devices booted | grep "Booted" | wc -l | tr -d ' ')
    if [ "$booted" -eq 0 ]; then
        print_warn "No iOS simulator is booted. Booting iPhone 17 Pro..."
        xcrun simctl boot "iPhone 17 Pro" 2>/dev/null || true
        sleep 3
    fi

    print_success "Prerequisites OK"
}

# Check backend is running
check_backend() {
    if [ -f "$BACKEND_DIR/infra/.env.generated" ]; then
        source "$BACKEND_DIR/infra/.env.generated"
        local ms_url="http://localhost:${MS_PORT:-8080}"
        print_step "Checking backend at $ms_url..."
        
        if curl -s -o /dev/null -w "%{http_code}" "$ms_url/actuator/health" | grep -q "200"; then
            print_success "Backend is healthy"
            return 0
        else
            print_warn "Backend is NOT healthy at $ms_url"
            return 1
        fi
    else
        print_warn "Backend env not found. Layer 2 & 3 integration tests may fail."
        return 1
    fi
}

# List simulators
list_simulators() {
    print_header "Available iOS Simulators"
    xcrun simctl list devices available | head -30
    echo ""
    print_step "Booted devices:"
    xcrun simctl list devices booted
}

# Build the app
build_app() {
    print_header "Building Chaos Mobile for iOS Simulator"
    
    cd "$PROJECT_DIR"
    
    print_step "Installing dependencies..."
    npm install
    
    print_step "Generating native project (Expo Prebuild)..."
    npx expo prebuild --platform ios --clean
    
    print_step "Building with Detox..."
    npx detox build --configuration "$DETOX_CONFIG"
    
    print_success "Build complete!"
}

# Run Layer 1 tests
run_layer1() {
    print_header "Layer 1: App-Level Chaos Tests"
    echo "Scenarios: 7 tests"
    echo "  1. High Latency → Skeleton Loaders"
    echo "  2. API 500 Error → Graceful Failure"
    echo "  3. Network Timeout → UI Stability"
    echo "  4. Offline Mode → App Stability"
    echo "  5. Empty Data → Graceful Empty State"
    echo "  6. POST Action Failure → Form Preservation"
    echo "  7. Status Cards → Degraded State"
    echo ""

    cd "$PROJECT_DIR"
    npx detox test --configuration "$DETOX_CONFIG" \
        --testPathPattern "layer1-app-chaos" \
        --headless false \
        2>&1 | tee e2e/reports/layer1-output.log

    print_success "Layer 1 tests complete!"
}

# Run Layer 2 tests
run_layer2() {
    print_header "Layer 2: Full-Stack Integration Chaos (Toxiproxy)"
    echo "Scenarios: 5 tests"
    echo "  1. 5s Real Database Latency"
    echo "  2. Real Database Connection Cut"
    echo "  3. Real Redis Cache Cut"
    echo "  4. Microservice Container Kill"
    echo "  5. Backend Recovery Verification"
    echo ""

    if ! check_backend; then
        print_error "Backend must be running for Layer 2 tests!"
        echo "Run: cd ../chaos-spring-ms && ./run.sh up"
        exit 1
    fi

    cd "$PROJECT_DIR"
    npx detox test --configuration "$DETOX_CONFIG" \
        --testPathPattern "layer2-integration-chaos" \
        --headless false \
        2>&1 | tee e2e/reports/layer2-output.log

    print_success "Layer 2 tests complete!"
}

# Run Layer 3 tests
run_layer3() {
    print_header "Layer 3: Mobile-Specific Chaos (xcrun simctl)"
    echo "Scenarios: 8 tests"
    echo "  1. Airplane Mode Toggle"
    echo "  2. Background/Foreground Transitions"
    echo "  3. Memory Pressure Warning"
    echo "  4. Low Battery State"
    echo "  5. Slow 3G Network Simulation"
    echo "  6. App Termination & Cold Restart"
    echo "  7. Orientation Change During Load"
    echo "  8. Selective Network Block"
    echo ""

    if ! check_backend; then
        print_error "Backend must be running for Layer 3 tests!"
        echo "Run: cd ../chaos-spring-ms && ./run.sh up"
        exit 1
    fi

    cd "$PROJECT_DIR"
    npx detox test --configuration "$DETOX_CONFIG" \
        --testPathPattern "layer3-mobile-chaos" \
        --headless false \
        2>&1 | tee e2e/reports/layer3-output.log

    print_success "Layer 3 tests complete!"
}

# Run ALL layers
run_all() {
    print_header "🚀 Running ALL Mobile Chaos Layers"
    check_prerequisites

    rm -f "$STATE_FILE"
    
    # Ensure backend is up and bootstrapped
    if [ -d "$BACKEND_DIR" ]; then
        print_step "Refreshing backend... (requires password for sudo if used)"
        cd "$BACKEND_DIR"
        ./run.sh down &>/dev/null || true
        ./run.sh up
        cd "$PROJECT_DIR"
    fi

    local start_time=$(date +%s)

    print_step "Executing all layers in a single run for unified reporting..."
    npx detox test --configuration "$DETOX_CONFIG" \
        --testPathPattern "layer" \
        --headless false \
        2>&1 | tee e2e/reports/full-chaos-run.log

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    print_header "📊 MOBILE CHAOS ENGINEERING — FINAL RESULTS"
    echo -e "  Total Duration: ${GREEN}${duration}s${NC}"
    echo -e "  Report: ${BLUE}$PROJECT_DIR/e2e/reports/extent-report.html${NC}"
    echo ""
    echo "  Layer 1 (App-Level):     7 scenarios"
    echo "  Layer 2 (Integration):   5 scenarios"
    echo "  Layer 3 (Mobile-Only):   8 scenarios"
    echo "  ─────────────────────────────────"
    echo -e "  ${GREEN}Total: 20 chaos scenarios${NC}"
    echo ""
}

# ── Main ──────────────────────────────────────────────

case "$1" in
    build)
        check_prerequisites
        build_app
        ;;
    layer1)
        check_prerequisites
        run_layer1
        ;;
    layer2)
        check_prerequisites
        run_layer2
        ;;
    layer3)
        check_prerequisites
        run_layer3
        ;;
    all)
        run_all
        ;;
    sim)
        list_simulators
        ;;
    *)
        echo ""
        echo "Usage: ./run-mobile-chaos.sh {build|layer1|layer2|layer3|all|sim}"
        echo ""
        echo "  build   — Build iOS app for simulator"
        echo "  layer1  — Run Layer 1 (App-Level Chaos, 7 tests)"
        echo "  layer2  — Run Layer 2 (Integration Chaos, 5 tests)"
        echo "  layer3  — Run Layer 3 (Mobile-Specific Chaos, 8 tests)"
        echo "  all     — Run ALL chaos layers (20 tests)"
        echo "  sim     — List available iOS simulators"
        echo ""
        exit 1
        ;;
esac
