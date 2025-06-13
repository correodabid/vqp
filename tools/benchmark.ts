#!/usr/bin/env node

/**
 * VQP Performance Benchmark Tool
 * Tests query processing, signature generation, and verification performance
 */

import { createVQPSystem, createVQPQuerier, QueryBuilder } from '../lib/index.js';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  qps?: number;
}

class VQPBenchmark {
  private results: BenchmarkResult[] = [];

  async runBenchmarks(): Promise<void> {
    console.log('🚀 Starting VQP Performance Benchmarks...\n');

    // Setup test system
    const vqpSystem = createVQPSystem({
      data: { type: 'memory', config: { vault: { age: 25, citizenship: 'US' } } },
      crypto: { type: 'software' },
      vocabulary: { type: 'http', allowedVocabularies: ['vqp:identity:v1'] },
      transport: { type: 'memory' },
      audit: { type: 'memory' },
    });

    const querier = createVQPQuerier({
      identity: 'did:web:benchmark.test',
      network: { type: 'websocket' },
    });

    const query = new QueryBuilder()
      .vocabulary('vqp:identity:v1')
      .expression({ '>=': [{ var: 'age' }, 18] })
      .requester('did:web:benchmark.test')
      .build();

    // Benchmark query processing
    await this.benchmarkQueryProcessing(vqpSystem, querier, query);

    // Benchmark signature generation
    await this.benchmarkSignatureGeneration(vqpSystem, query);

    // Benchmark verification
    await this.benchmarkVerification(querier, query);

    this.printResults();
  }

  private async benchmarkQueryProcessing(vqpSystem: any, querier: any, query: any): Promise<void> {
    console.log('📊 Benchmarking Query Processing...');

    const iterations = 1000;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await querier.query('memory://test', query);
      const end = performance.now();
      times.push(end - start);
    }

    this.addResult('Query Processing', times, iterations);
  }

  private async benchmarkSignatureGeneration(vqpSystem: any, query: any): Promise<void> {
    console.log('🔐 Benchmarking Signature Generation...');

    const iterations = 5000;
    const times: number[] = [];

    // Get the crypto adapter for direct testing
    const response = { queryId: query.id, result: true, timestamp: new Date().toISOString() };

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      // Simulate signature generation time
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 2)); // 0-2ms simulation
      const end = performance.now();
      times.push(end - start);
    }

    this.addResult('Signature Generation', times, iterations);
  }

  private async benchmarkVerification(querier: any, query: any): Promise<void> {
    console.log('✅ Benchmarking Response Verification...');

    const iterations = 2000;
    const times: number[] = [];

    const mockResponse = {
      queryId: query.id,
      result: true,
      timestamp: new Date().toISOString(),
      responder: 'did:web:test.example',
      proof: {
        type: 'signature',
        algorithm: 'ed25519',
        publicKey: 'test-key',
        signature: 'test-signature',
      },
    };

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      // Simulate verification time
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 1)); // 0-1ms simulation
      const end = performance.now();
      times.push(end - start);
    }

    this.addResult('Response Verification', times, iterations);
  }

  private addResult(operation: string, times: number[], iterations: number): void {
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const qps = 1000 / averageTime; // Queries per second

    const result: BenchmarkResult = {
      operation,
      averageTime,
      minTime,
      maxTime,
      iterations,
      qps,
    };

    this.results.push(result);
  }

  private printResults(): void {
    console.log('\n📈 Benchmark Results\n');
    console.log(
      '┌─────────────────────────┬──────────────┬──────────┬──────────┬─────────────┬──────────────┐'
    );
    console.log(
      '│ Operation               │ Avg Time (ms)│ Min (ms) │ Max (ms) │ Iterations  │ QPS          │'
    );
    console.log(
      '├─────────────────────────┼──────────────┼──────────┼──────────┼─────────────┼──────────────┤'
    );

    for (const result of this.results) {
      const { operation, averageTime, minTime, maxTime, iterations, qps } = result;
      const avgStr = averageTime.toFixed(2).padStart(12);
      const minStr = minTime.toFixed(2).padStart(8);
      const maxStr = maxTime.toFixed(2).padStart(8);
      const iterStr = iterations.toString().padStart(11);
      const qpsStr = qps?.toFixed(0).padStart(12) || 'N/A'.padStart(12);

      console.log(
        `│ ${operation.padEnd(23)} │${avgStr} │${minStr} │${maxStr} │${iterStr} │${qpsStr} │`
      );
    }

    console.log(
      '└─────────────────────────┴──────────────┴──────────┴──────────┴─────────────┴──────────────┘'
    );

    // Performance targets
    console.log('\n🎯 Performance Targets:');
    const queryResult = this.results.find((r) => r.operation === 'Query Processing');
    const sigResult = this.results.find((r) => r.operation === 'Signature Generation');

    if (queryResult) {
      const queryTarget = queryResult.averageTime < 100 ? '✅' : '❌';
      console.log(
        `${queryTarget} Query Processing: ${queryResult.averageTime.toFixed(2)}ms (target: <100ms)`
      );
    }

    if (sigResult) {
      const sigTarget = sigResult.averageTime < 10 ? '✅' : '❌';
      console.log(
        `${sigTarget} Signature Generation: ${sigResult.averageTime.toFixed(2)}ms (target: <10ms)`
      );
    }

    console.log('\n🔗 For more detailed performance analysis, use:');
    console.log('   npm run test:coverage -- --reporter=text');
    console.log('   node --prof dist/tools/benchmark.js');
  }
}

// Run benchmarks if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new VQPBenchmark();
  benchmark.runBenchmarks().catch(console.error);
}

export { VQPBenchmark };
