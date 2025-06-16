# VQP Development Tools

This directory contains development and testing tools for the VQP protocol.

## Available Tools

### Zero-Knowledge Proof Tools

- **`setup-snarkjs.sh`** - Sets up snarkjs environment and trusted setup

### Development Tools

- **`benchmark.ts`** - Performance benchmarking tool for VQP operations

## Usage

### ZK Proof Development

```bash
# Set up snarkjs environment and compile circuits
./setup-snarkjs.sh
```

### Performance Testing

```bash
# Run performance benchmarks
npx tsx benchmark.ts
```

## Notes

- These tools are for development and testing only
- For production usage, use the modular packages in `/packages/`
- ZK proof tools require circom and snarkjs to be installed
- Circuits are located in `/circuits/` directory (not in tools)
- Use examples in `/examples/` for testing VQP functionality and ZK proofs
