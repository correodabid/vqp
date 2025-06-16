#!/bin/bash

# Script para publicar todos los paquetes del monorepo VQP
set -e

echo "🚀 Publishing VQP packages to npm..."

# Build all packages first
echo "Building all packages..."
npm run build

# Function to publish a package
publish_package() {
    local package_dir=$1
    local package_name=$(cat "$package_dir/package.json" | grep '"name"' | cut -d'"' -f4)
    
    echo "📦 Publishing $package_name..."
    cd "$package_dir"
    
    # Check if package is already published with this version
    local version=$(cat package.json | grep '"version"' | cut -d'"' -f4)
    if npm view "$package_name@$version" version 2>/dev/null; then
        echo "⚠️  $package_name@$version already published, skipping..."
    else
        npm publish --access public
        echo "✅ $package_name@$version published successfully"
    fi
    
    cd - > /dev/null
}

# Publish packages in dependency order
echo "Publishing packages..."

# 1. Core package first (no dependencies)
publish_package "packages/core"

# 2. Adapters that depend on core
publish_package "packages/crypto-software"
publish_package "packages/crypto-snarkjs"
publish_package "packages/data-filesystem"
publish_package "packages/data-encrypted"
publish_package "packages/evaluation-jsonlogic"
publish_package "packages/vocab-http"
publish_package "packages/vocab-schemaorg"
publish_package "packages/audit-console"
publish_package "packages/audit-file"
publish_package "packages/audit-memory"

echo "🎉 All packages published successfully!"
echo ""
echo "Users can now install:"
echo "  npm install @vqp/core @vqp/crypto-software @vqp/data-filesystem"
echo ""
echo "Or specific combinations:"
echo "  npm install @vqp/core @vqp/crypto-snarkjs @vqp/data-encrypted"
