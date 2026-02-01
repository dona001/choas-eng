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

# Run Playwright chaos tests
echo "🎭 Executing Playwright chaos scenarios..."
npx playwright test --reporter=html

# Open the report
echo ""
echo "✅ All chaos tests completed!"
echo "📊 Opening HTML report..."
npx playwright show-report
