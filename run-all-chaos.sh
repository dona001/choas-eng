#!/bin/bash
set -e

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT=$(pwd)
API_DIR="$PROJECT_ROOT/chaos-spring-ms"
WEB_DIR="$PROJECT_ROOT/chaos-frontend"
MOBILE_DIR="$PROJECT_ROOT/chaos-mobile"

print_header() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${BLUE}  🚀 $1${NC}"
    echo -e "${BLUE}================================================================${NC}\n"
}

# 1. API Chaos Tests
print_header "Step 1: Running API Chaos Tests (Backend)"
cd "$API_DIR"
./run.sh up
./run.sh chaos
echo -e "${GREEN}✅ API Chaos Tests Finished${NC}"

# 2. Web Chaos Tests
print_header "Step 2: Running Web Chaos Tests (Playwright)"
cd "$WEB_DIR"
# Building if needed (already handled by playwright config but good to be sure)
npm run build
# We run without 'npx allure open' to prevent hanging the script
npx playwright test
npx allure generate allure-results --clean -o allure-report
echo -e "${GREEN}✅ Web Chaos Tests Finished${NC}"

# 3. Mobile Chaos Tests
print_header "Step 3: Running Mobile Chaos Tests (Detox)"
cd "$MOBILE_DIR"
# Ensure backend is refreshed again as mobile script expects it
./run-mobile-chaos.sh all
echo -e "${GREEN}✅ Mobile Chaos Tests Finished${NC}"

# 4. Consolidate Reports
print_header "Step 4: Consolidating Reports to Root"
REPORT_DIR="$PROJECT_ROOT/reports"
mkdir -p "$REPORT_DIR"

echo "📂 Creating centralized report directory..."

# Copy API Report
if [ -f "$API_DIR/tests/chaos_report.html" ]; then
    cp "$API_DIR/tests/chaos_report.html" "$REPORT_DIR/api-chaos-report.html"
    echo "📄 API Report copied."
fi

# Copy Web Report (Allure)
if [ -d "$WEB_DIR/allure-report" ]; then
    rm -rf "$REPORT_DIR/web-chaos"
    cp -R "$WEB_DIR/allure-report" "$REPORT_DIR/web-chaos"
    echo "📁 Web Allure Report copied."
fi

# Copy Mobile Report
if [ -f "$MOBILE_DIR/e2e/reports/extent-report.html" ]; then
    cp "$MOBILE_DIR/e2e/reports/extent-report.html" "$REPORT_DIR/mobile-chaos-report.html"
    echo "📄 Mobile Extent Report copied."
fi

print_header "🏁 ALL CHAOS TEST SUITES COMPLETED!"
echo -e "${GREEN}All reports are centralized in: $REPORT_DIR${NC}"
echo -e "- ${YELLOW}Combined View:${NC}   $REPORT_DIR"
echo -e "- ${YELLOW}API:${NC}             $REPORT_DIR/api-chaos-report.html"
echo -e "- ${YELLOW}Web:${NC}             $REPORT_DIR/web-chaos/index.html"
echo -e "- ${YELLOW}Mobile:${NC}          $REPORT_DIR/mobile-chaos-report.html"
echo -e "\n${GREEN}Everything looks solid!${NC}"
