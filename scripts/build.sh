#!/bin/bash

# VQP Build Script
# Builds the library for npm distribution

set -e

echo "🚀 Building VQP library for npm distribution..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Build TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Copy essential files
echo "📋 Copying assets..."
mkdir -p dist/tools

# Copy CLI tool and make executable
cp tools/vqp dist/tools/
chmod +x dist/tools/vqp

# Copy vendor files if they exist (for jsonlogic-js)
if [ -d "vendor" ]; then
    echo "📁 Copying vendor files..."
    cp -r vendor dist/
fi

# Note: Circuit files are NOT copied as they are example-specific
# Users should create their own circuits for their specific use cases
echo "ℹ️  Note: Circuit files not included - users should generate their own circuits"

# Validate build
echo "✅ Validating build..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

if [ ! -f "dist/index.d.ts" ]; then
    echo "❌ Build failed: dist/index.d.ts not found"
    exit 1
fi

# Check package size
PACKAGE_SIZE=$(du -sh dist/ | cut -f1)
echo "📊 Package size: $PACKAGE_SIZE"

# Run a quick smoke test
echo "🧪 Running smoke test..."
node -e "
const vqp = require('./dist/index.js');
if (!vqp.createVQPSystem) {
  console.error('❌ Smoke test failed: createVQPSystem not exported');
  process.exit(1);
}
console.log('✅ Smoke test passed');
"

echo "🎉 Build completed successfully!"
echo "📦 Ready for npm publish with package size: $PACKAGE_SIZE"
