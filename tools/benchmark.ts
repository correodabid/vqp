#!/usr/bin/env node

/**
 * Simple VQP Performance Benchmark Tool
 * Tests basic cryptographic operations performance
 */

import { SoftwareCryptoAdapter } from '../packages/crypto-software/src/index.js';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  opsPerSecond: number;
}

class VQPBenchmark {
  private results: BenchmarkResult[] = [];

  async runBenchmarks(): Promise<void> {
    console.log('🚀 Starting VQP Performance Benchmarks...\n');

    const crypto = new SoftwareCryptoAdapter();

    // Generate a key pair for testing
    await crypto.addKeyPair('benchmark-key');

    // Run benchmarks
    await this.benchmarkSignatureGeneration(crypto);
    await this.benchmarkSignatureVerification(crypto);

    this.printResults();
  }

  private async benchmarkSignatureGeneration(crypto: SoftwareCryptoAdapter): Promise<void> {
    console.log('🔐 Benchmarking Ed25519 Signature Generation...');

    const iterations = 1000;
    const times: number[] = [];
    const testData = Buffer.from('VQP test message for signature benchmarking');

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await crypto.sign(testData, 'benchmark-key');
      const end = performance.now();
      times.push(end - start);
    }

    this.addResult('Ed25519 Signature Generation', times, iterations);
  }

  private async benchmarkSignatureVerification(crypto: SoftwareCryptoAdapter): Promise<void> {
    console.log('🔍 Benchmarking Ed25519 Signature Verification...');

    const iterations = 1000;
    const times: number[] = [];
    const testData = Buffer.from('VQP test message for verification benchmarking');

    // Generate a signature to verify
    const signature = await crypto.sign(testData, 'benchmark-key');
    const publicKey = crypto.getPublicKey('benchmark-key');
    if (!publicKey) {
      throw new Error('Public key not found for benchmark-key');
    }

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await crypto.verify(signature, testData, publicKey);
      const end = performance.now();
      times.push(end - start);
    }

    this.addResult('Ed25519 Signature Verification', times, iterations);
  }

  private addResult(operation: string, times: number[], iterations: number): void {
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const opsPerSecond = 1000 / averageTime; // Convert ms to ops/sec

    const result: BenchmarkResult = {
      operation,
      averageTime,
      minTime,
      maxTime,
      iterations,
      opsPerSecond,
    };

    this.results.push(result);
  }

  private printResults(): void {
    console.log('\n📊 Benchmark Results:');
    console.log('='.repeat(80));

    this.results.forEach((result) => {
      console.log(`\n${result.operation}:`);
      console.log(`  Iterations: ${result.iterations.toLocaleString()}`);
      console.log(`  Average time: ${result.averageTime.toFixed(3)} ms`);
      console.log(`  Min time: ${result.minTime.toFixed(3)} ms`);
      console.log(`  Max time: ${result.maxTime.toFixed(3)} ms`);
      console.log(`  Operations/sec: ${result.opsPerSecond.toFixed(0)}`);
    });

    console.log('\n🎯 Performance Targets:');
    console.log('  Signature Generation: >1000 ops/sec (target: <1ms avg)');
    console.log('  Signature Verification: >2000 ops/sec (target: <0.5ms avg)');

    // Check if targets are met
    const sigGenResult = this.results.find((r) => r.operation.includes('Generation'));
    const sigVerResult = this.results.find((r) => r.operation.includes('Verification'));

    if (sigGenResult && sigGenResult.opsPerSecond >= 1000) {
      console.log('  ✅ Signature generation target met');
    } else {
      console.log('  ❌ Signature generation target not met');
    }

    if (sigVerResult && sigVerResult.opsPerSecond >= 2000) {
      console.log('  ✅ Signature verification target met');
    } else {
      console.log('  ❌ Signature verification target not met');
    }
  }
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new VQPBenchmark();
  benchmark.runBenchmarks().catch(console.error);
}

export { VQPBenchmark };
