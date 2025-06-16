#!/bin/bash

echo "🔄 Actualizando dependencias @vqp/* a workspace references..."

# Lista de packages que necesitan actualización
packages=(
  "evaluation-jsonlogic"
  "crypto-snarkjs"
  "audit-memory"
  "data-filesystem"
  "data-encrypted"
  "audit-file"
  "crypto-software"
  "audit-console"
  "vocab-http"
)

# Actualizar cada package específicamente
for pkg in "${packages[@]}"; do
  package_file="packages/$pkg/package.json"
  if [ -f "$package_file" ]; then
    echo "✅ Actualizando $pkg"
    # Actualizar solo las dependencias @vqp/core a workspace:*
    sed -i '' 's/"@vqp\/core": "[^"]*"/"@vqp\/core": "workspace:*"/g' "$package_file"
  else
    echo "⚠️  No encontrado: $package_file"
  fi
done

echo "✅ Dependencias actualizadas a workspace references"
echo "🔄 Limpiando node_modules y package-lock.json..."

# Limpiar y reinstalar
rm -rf node_modules package-lock.json

echo "🔄 Ejecutando npm install..."
npm install

echo "✅ ¡Listo! Monorepo actualizado con workspace references"
echo ""
echo "Verificando instalación:"
npm ls --depth=0
