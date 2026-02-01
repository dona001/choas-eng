#!/bin/bash
set -e

echo "🚀 Starting Frontend Chaos Test Suite..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the application
echo "🏗️  Building Next.js application..."
npm run build

# Clean previous results
rm -rf allure-results allure-report

# Run Playwright chaos tests (visible browser)
echo "🎭 Executing Playwright chaos scenarios (Watch the browser!)..."
npx playwright test

# Generate Allure report
echo "📊 Generating Allure report..."
npx allure generate allure-results --clean -o allure-report

# Open the report
echo ""
echo "✅ All chaos tests completed!"
echo "📊 Opening Allure report..."
npx allure open allure-report
