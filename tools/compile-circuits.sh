#!/bin/bash

# VQP Circuit Compilation Script
# This script compiles Circom circuits for use with VQP and snarkjs

set -e

echo "🔧 VQP Circuit Compilation"
echo "=========================="
echo ""

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ circom is not installed."
    echo ""
    echo "Please install circom:"
    echo "   curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh"
    echo "   source ~/.cargo/env"
    echo "   git clone https://github.com/iden3/circom.git"
    echo "   cd circom"
    echo "   cargo build --release"
    echo "   cargo install --path circom"
    exit 1
fi

# Check if snarkjs is available
if ! command -v snarkjs &> /dev/null && ! npm list snarkjs &> /dev/null; then
    echo "❌ snarkjs is not available."
    echo "   Installing snarkjs..."
    npm install snarkjs
fi

# Create circuits directory
CIRCUITS_DIR="circuits"
mkdir -p "$CIRCUITS_DIR"

echo "📁 Working in directory: $CIRCUITS_DIR"
echo ""

# Age verification circuit
AGE_CIRCUIT="$CIRCUITS_DIR/age_verification.circom"

if [ ! -f "$AGE_CIRCUIT" ]; then
    echo "📝 Creating age verification circuit..."
    cat > "$AGE_CIRCUIT" << 'EOF'
pragma circom 2.0.0;

template AgeVerification() {
    signal input age;
    signal input threshold;
    signal output isValid;
    
    // Check if age >= threshold using manual comparison
    component gteq = GreaterEqualThan(32); // 32 bits for age values
    gteq.in[0] <== age;
    gteq.in[1] <== threshold;
    
    isValid <== gteq.out;
}

// Simple greater-than-or-equal component
template GreaterEqualThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component lt = LessThan(n+1);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0]+1;
    
    out <== lt.out;
}

// Simple less-than component
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n);
    n2b.in <== in[0] + (1<<n) - in[1];

    out <== 1 - n2b.out[n];
}

// Number to bits conversion
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

component main = AgeVerification();
EOF
    echo "✅ Created $AGE_CIRCUIT"
else
    echo "📄 Using existing $AGE_CIRCUIT"
fi
    signal input threshold;
    signal output valid;
    
    // Check if age >= threshold
    component gte = GreaterEqualThan(8); // 8 bits should be enough for age values
    gte.in[0] <== age;
    gte.in[1] <== threshold;
    
    valid <== gte.out;
}

component main = AgeVerification();
EOF
    echo "✅ Created $AGE_CIRCUIT"
else
    echo "📄 Using existing $AGE_CIRCUIT"
fi

# Income verification circuit
INCOME_CIRCUIT="$CIRCUITS_DIR/income_verification.circom"

if [ ! -f "$INCOME_CIRCUIT" ]; then
    echo "📝 Creating income verification circuit..."
    cat > "$INCOME_CIRCUIT" << 'EOF'
pragma circom 2.0.0;

template IncomeVerification() {
    signal input income;
    signal input threshold;
    signal output isValid;
    
    // Check if income >= threshold
    component gteq = GreaterEqualThan(64); // 64 bits for income values
    gteq.in[0] <== income;
    gteq.in[1] <== threshold;
    
    isValid <== gteq.out;
}

// Simple greater-than-or-equal component
template GreaterEqualThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;
    
    component lt = LessThan(n+1);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0]+1;
    
    out <== lt.out;
}

// Simple less-than component
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n);
    n2b.in <== in[0] + (1<<n) - in[1];

    out <== 1 - n2b.out[n];
}

// Number to bits conversion
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

component main = IncomeVerification();
EOF
    echo "✅ Created $INCOME_CIRCUIT"
else
    echo "📄 Using existing $INCOME_CIRCUIT"
fi

echo ""
echo "🏗️  Compiling circuits..."

# Function to compile a circuit
compile_circuit() {
    local circuit_name=$1
    local circuit_file="$CIRCUITS_DIR/${circuit_name}.circom"
    
    echo "   Compiling $circuit_name..."
    
    # Compile circuit
    if circom "$circuit_file" --r1cs --wasm --sym -o "$CIRCUITS_DIR"; then
        echo "   ✅ $circuit_name compiled successfully"
        
        # Generate witness calculator info
        echo "   📊 Circuit info:"
        echo "      - R1CS: $CIRCUITS_DIR/${circuit_name}.r1cs"
        echo "      - WASM: $CIRCUITS_DIR/${circuit_name}_js/${circuit_name}.wasm"
        echo "      - Symbols: $CIRCUITS_DIR/${circuit_name}.sym"
    else
        echo "   ❌ Failed to compile $circuit_name"
        return 1
    fi
}

# Compile all circuits
compile_circuit "age_verification"
compile_circuit "income_verification"

echo ""
echo "✅ Circuit compilation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run setup for proving keys: npm run zk:setup"
echo "   2. Test ZK proofs: npm run zk:example"
echo ""
echo "📄 Generated files in circuits/:"
ls -la "$CIRCUITS_DIR" | grep -E '\.(r1cs|wasm|sym)$' || echo "   (No compiled files found - check for errors above)"
