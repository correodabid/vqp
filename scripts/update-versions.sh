#!/bin/bash

# Update VQP version across all packages

echo "Updating VQP versions..."

# Update all package.json files in packages directory
find packages -name "package.json" -type f -exec sed -i '' 's/"version": "1\.0\.0"/"version": "0.0.5"/g' {} \;

# Update all @vqp/* dependency versions 
find packages -name "package.json" -type f -exec sed -i '' 's/"@vqp\/[^"]*": "\^1\.0\.0"/"@vqp\/core": "^0.0.5"/g' {} \;
find packages -name "package.json" -type f -exec sed -i '' 's/"@vqp\/[^"]*": "1\.0\.0"/"@vqp\/core": "0.0.5"/g' {} \;

# More specific updates for each package dependency
for package in packages/*/package.json; do
  echo "Updating dependencies in $package"
  sed -i '' 's/"@vqp\/core": "\^1\.0\.0"/"@vqp\/core": "^0.0.5"/g' "$package"
  sed -i '' 's/"@vqp\/crypto-software": "\^1\.0\.0"/"@vqp\/crypto-software": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/crypto-snarkjs": "\^1\.0\.0"/"@vqp\/crypto-snarkjs": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/data-filesystem": "\^1\.0\.0"/"@vqp\/data-filesystem": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/data-encrypted": "\^1\.0\.0"/"@vqp\/data-encrypted": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/evaluation-jsonlogic": "\^1\.0\.0"/"@vqp\/evaluation-jsonlogic": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/audit-console": "\^1\.0\.0"/"@vqp\/audit-console": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/audit-file": "\^1\.0\.0"/"@vqp\/audit-file": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/audit-memory": "\^1\.0\.0"/"@vqp\/audit-memory": "^0.0.1"/g' "$package"
  sed -i '' 's/"@vqp\/vocab-http": "\^1\.0\.0"/"@vqp\/vocab-http": "^0.0.1"/g' "$package"
done

echo "Version update complete. All packages updated"
