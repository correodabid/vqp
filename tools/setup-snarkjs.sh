#!/bin/bash

# VQP snarkjs Setup Script
# This script helps set up circuits and keys for zero-knowledge proofs

set -e

echo "🔐 VQP snarkjs Setup"
echo "==================="

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "⚠️  snarkjs not found. Installing..."
    npm install -g snarkjs
fi

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "⚠️  circom not found. Please install circom first:"
    echo "    cargo install --git https://github.com/iden3/circom.git"
    exit 1
fi

# Create circuits directory
CIRCUITS_DIR="./circuits"
mkdir -p "$CIRCUITS_DIR"

echo "📁 Created circuits directory: $CIRCUITS_DIR"

# Example age verification circuit
cat > "$CIRCUITS_DIR/age_verification.circom" << 'EOF'
pragma circom 2.0.0;

template AgeVerification() {
    signal input age;
    signal input threshold;
    signal output isValid;
    
    // Very simple demo circuit
    // For now, just outputs 1 if age > 0 and threshold > 0
    // This is just to test the infrastructure
    
    signal agePositive;
    signal thresholdPositive;
    
    // Check if age > 0
    agePositive <-- (age > 0) ? 1 : 0;
    agePositive * (agePositive - 1) === 0; // Ensure boolean
    age * agePositive === age; // If agePositive = 1, then age > 0
    
    // Check if threshold > 0  
    thresholdPositive <-- (threshold > 0) ? 1 : 0;
    thresholdPositive * (thresholdPositive - 1) === 0; // Ensure boolean
    threshold * thresholdPositive === threshold; // If thresholdPositive = 1, then threshold > 0
    
    // Output is 1 if both are positive
    isValid <== agePositive * thresholdPositive;
}

component main = AgeVerification();
EOF

echo "📝 Created example circuit: age_verification.circom"

# Compile circuit
echo "🔨 Compiling circuit..."
cd "$CIRCUITS_DIR"
circom age_verification.circom --r1cs --wasm --sym --c

# Generate proving key (this requires a powers of tau ceremony)
echo "🔑 Generating keys..."

# Start a new powers of tau ceremony (for demo - in production use existing ceremony)
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate zkey
snarkjs groth16 setup age_verification.r1cs pot12_final.ptau age_verification_0000.zkey
snarkjs zkey contribute age_verification_0000.zkey age_verification_final.zkey --name="VQP contribution" -v

# Export verification key
snarkjs zkey export verificationkey age_verification_final.zkey age_verification_verification_key.json

echo "✅ Circuit setup complete!"
echo ""
echo "📄 Generated files:"
echo "   - age_verification.wasm (circuit execution)"
echo "   - age_verification_final.zkey (proving key)"
echo "   - age_verification_verification_key.json (verification key)"
echo ""
echo "🚀 You can now use ZK proofs in VQP!"
echo ""
echo "Example usage:"
echo "   const config = {"
echo "     circuits: {"
echo "       age_verification: {"
echo "         wasmPath: './circuits/age_verification.wasm',"
echo "         zkeyPath: './circuits/age_verification_final.zkey',"
echo "         verificationKeyPath: './circuits/age_verification_verification_key.json'"
echo "       }"
echo "     }"
echo "   };"
