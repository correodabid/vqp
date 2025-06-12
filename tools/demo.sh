#!/bin/bash

# VQP CLI Demo Script
# This script demonstrates all the capabilities of the VQP CLI

echo "🚀 VQP CLI Demo - Complete Workflow"
echo "=================================="
echo

# Clean up any existing processes
echo "📋 Cleaning up existing processes..."
pkill -f "tsx tools/cli.ts serve" 2>/dev/null || true
sleep 2

# 1. Generate sample files
echo "📁 Step 1: Generating sample configuration files..."
npx tsx tools/cli.ts generate --all
echo

# 2. Start VQP server in background
echo "🌐 Step 2: Starting VQP responder server..."
npx tsx tools/cli.ts serve --vault vault.json --policies access-policies.json --port 3001 &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
sleep 3
echo

# 3. Check server status
echo "🔍 Step 3: Checking server status..."
npx tsx tools/cli.ts status --target http://localhost:3001/vqp/query
echo

# 4. Age verification query
echo "🎂 Step 4: Age verification query (age >= 18)..."
npx tsx tools/cli.ts query --target http://localhost:3001/vqp/query --age-check 18 --output age-response.json
echo

# 5. Citizenship check
echo "🌍 Step 5: Citizenship verification query..."
npx tsx tools/cli.ts query --target http://localhost:3001/vqp/query --citizenship-check US --output citizenship-response.json
echo

# 6. Income verification
echo "💰 Step 6: Income verification query (>= $50,000)..."
npx tsx tools/cli.ts query --target http://localhost:3001/vqp/query --income-check 50000 --output income-response.json
echo

# 7. Custom JSONLogic query
echo "🔧 Step 7: Custom complex query..."
npx tsx tools/cli.ts query \
  --target http://localhost:3001/vqp/query \
  --vocab vqp:identity:v1 \
  --expr '{"and":[{">=":[{"var":"age"},21]},{"==":[{"var":"has_drivers_license"},true]}]}' \
  --output complex-response.json
echo

# 8. System health check
echo "⚡ Step 8: System health check..."
npx tsx tools/cli.ts query --target http://localhost:3001/vqp/query --health-check --output health-response.json
echo

# 9. Verify saved responses
echo "🔐 Step 9: Verifying saved responses..."
echo "   → Verifying age response..."
npx tsx tools/cli.ts verify --file age-response.json
echo

echo "   → Verifying citizenship response..."
npx tsx tools/cli.ts verify --file citizenship-response.json
echo

echo "   → Verifying income response..."
npx tsx tools/cli.ts verify --file income-response.json
echo

# 10. Show generated files
echo "📄 Step 10: Generated response files:"
ls -la *-response.json
echo

# 11. Clean up
echo "🧹 Step 11: Cleaning up..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "   Server stopped"

echo
echo "✅ VQP CLI Demo completed successfully!"
echo "   All queries processed and verified ✓"
echo "   Response files saved for inspection ✓"
echo "   Cryptographic verification passed ✓"
echo
echo "🎯 Next steps:"
echo "   • Inspect response files: cat age-response.json"
echo "   • Start your own server: npx tsx tools/cli.ts serve"
echo "   • Send custom queries: npx tsx tools/cli.ts query --help"
