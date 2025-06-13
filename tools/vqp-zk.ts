#!/usr/bin/env node

/**
 * VQP ZK Proof CLI - Command line tools for ZK proof development
 */

import { Command } from 'commander';
import { SnarkjsCryptoAdapter } from '../lib/adapters/crypto/snarkjs-adapter.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('vqp-zk')
  .description('VQP Zero-Knowledge Proof CLI')
  .version('1.0.0');

// Generate proof command
program
  .command('prove')
  .description('Generate a zero-knowledge proof')
  .requiredOption('-c, --circuit <circuit>', 'Circuit ID')
  .requiredOption('-i, --input <json>', 'Private inputs as JSON string')
  .option('-p, --public <json>', 'Public inputs as JSON string', '{}')
  .option('--config <path>', 'Path to circuit configuration file', './circuits/config.json')
  .action(async (options) => {
    const spinner = ora('Generating ZK proof...').start();
    
    try {
      // Load circuit configuration
      const configPath = path.resolve(options.config);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Parse inputs
      const privateInputs = JSON.parse(options.input);
      const publicInputs = JSON.parse(options.public);
      
      // Create adapter and generate proof
      const zkCrypto = new SnarkjsCryptoAdapter(config);
      
      // Load the circuit if not already loaded
      if (!(await zkCrypto.hasCircuit!(options.circuit))) {
        spinner.text = 'Loading circuit...';
        const circuitConfig = config.circuits[options.circuit];
        if (!circuitConfig) {
          throw new Error(`Circuit ${options.circuit} not found in configuration`);
        }
        
        const circuitPath = `${options.circuit}:${circuitConfig.wasmPath}:${circuitConfig.zkeyPath}:${circuitConfig.verificationKeyPath}`;
        await zkCrypto.loadCircuit!(circuitPath);
      }
      
      spinner.text = 'Generating proof...';
      const proof = await zkCrypto.generateZKProof!(options.circuit, privateInputs, publicInputs);
      
      spinner.succeed('Proof generated successfully!');
      
      console.log('\n' + chalk.green('Generated Proof:'));
      console.log(JSON.stringify(proof, null, 2));
      
      // Save proof to file
      const proofPath = `./proof_${options.circuit}_${Date.now()}.json`;
      await fs.writeFile(proofPath, JSON.stringify(proof, null, 2));
      console.log(chalk.blue(`\nProof saved to: ${proofPath}`));
      process.exit(0);
      
    } catch (error) {
      spinner.fail('Proof generation failed');
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Verify proof command
program
  .command('verify')
  .description('Verify a zero-knowledge proof')
  .requiredOption('-f, --file <path>', 'Path to proof file')
  .option('-p, --public <json>', 'Public inputs as JSON string')
  .option('-c, --circuit <circuit>', 'Circuit ID (override proof circuit)')
  .option('--config <path>', 'Path to circuit configuration file', './circuits/config.json')
  .action(async (options) => {
    const spinner = ora('Verifying ZK proof...').start();
    
    try {
      // Load proof
      const proofPath = path.resolve(options.file);
      const proofData = await fs.readFile(proofPath, 'utf-8');
      const proof = JSON.parse(proofData);
      
      // Load circuit configuration
      const configPath = path.resolve(options.config);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Parse public inputs
      const publicInputs = options.public ? JSON.parse(options.public) : proof.publicInputs;
      const circuitId = options.circuit || proof.circuit;
      
      // Create adapter and verify proof
      const zkCrypto = new SnarkjsCryptoAdapter(config);
      
      // Load the circuit if not already loaded
      if (!(await zkCrypto.hasCircuit!(circuitId))) {
        spinner.text = 'Loading circuit...';
        const circuitConfig = config.circuits[circuitId];
        if (!circuitConfig) {
          throw new Error(`Circuit ${circuitId} not found in configuration`);
        }
        
        const circuitPath = `${circuitId}:${circuitConfig.wasmPath}:${circuitConfig.zkeyPath}:${circuitConfig.verificationKeyPath}`;
        await zkCrypto.loadCircuit!(circuitPath);
      }
      
      spinner.text = 'Verifying proof...';
      const isValid = await zkCrypto.verifyZKProof!(proof, publicInputs, circuitId);
      
      if (isValid) {
        spinner.succeed('Proof verification successful!');
        console.log(chalk.green('\n✅ Proof is VALID'));
        process.exit(0);
      } else {
        spinner.fail('Proof verification failed!');
        console.log(chalk.red('\n❌ Proof is INVALID'));
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Verification failed');
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// List circuits command
program
  .command('circuits')
  .description('List available circuits')
  .option('--config <path>', 'Path to circuit configuration file', './circuits/config.json')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      console.log(chalk.blue('Available Circuits:'));
      console.log('==================\n');
      
      for (const [circuitId, circuitConfig] of Object.entries(config.circuits || {})) {
        const circuit = circuitConfig as any;
        console.log(chalk.green(`${circuitId}:`));
        console.log(`  WASM: ${circuit.wasmPath}`);
        console.log(`  zKey: ${circuit.zkeyPath}`);
        console.log(`  Verification Key: ${circuit.verificationKeyPath || 'Not provided'}`);
        console.log(`  Proving System: ${circuit.provingSystem || 'groth16'}`);
        
        // Check if files exist
        try {
          await fs.access(circuit.wasmPath);
          console.log(chalk.green('  ✅ WASM file exists'));
        } catch {
          console.log(chalk.red('  ❌ WASM file missing'));
        }
        
        try {
          await fs.access(circuit.zkeyPath);
          console.log(chalk.green('  ✅ zKey file exists'));
        } catch {
          console.log(chalk.red('  ❌ zKey file missing'));
        }
        
        console.log('');
      }
      
    } catch (error) {
      console.error(chalk.red('Error loading configuration:'), (error as Error).message);
      process.exit(1);
    }
  });

// Test circuit command
program
  .command('test')
  .description('Test a circuit with sample data')
  .requiredOption('-c, --circuit <circuit>', 'Circuit ID')
  .option('--config <path>', 'Path to circuit configuration file', './circuits/config.json')
  .action(async (options) => {
    const spinner = ora('Testing circuit...').start();
    
    try {
      // Load configuration
      const configPath = path.resolve(options.config);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      const zkCrypto = new SnarkjsCryptoAdapter(config);
      
      // Load circuit
      spinner.text = 'Loading circuit...';
      const circuitConfig = config.circuits[options.circuit];
      if (!circuitConfig) {
        throw new Error(`Circuit ${options.circuit} not found`);
      }
      
      const circuitPath = `${options.circuit}:${circuitConfig.wasmPath}:${circuitConfig.zkeyPath}:${circuitConfig.verificationKeyPath}`;
      await zkCrypto.loadCircuit!(circuitPath);
      
      // Test with sample data based on circuit type
      let privateInputs: any;
      let publicInputs: any;
      
      switch (options.circuit) {
        case 'age_verification':
          privateInputs = { age: 25, threshold: 18 };
          publicInputs = { threshold: 18 };
          break;
        case 'income_verification':
          privateInputs = { income: 75000, threshold: 50000 };
          publicInputs = { threshold: 50000 };
          break;
        default:
          throw new Error(`No test data available for circuit: ${options.circuit}`);
      }
      
      console.log(chalk.blue('\nTest Inputs:'));
      console.log('Private:', JSON.stringify(privateInputs, null, 2));
      console.log('Public:', JSON.stringify(publicInputs, null, 2));
      
      // Generate proof
      spinner.text = 'Generating test proof...';
      const proof = await zkCrypto.generateZKProof!(options.circuit, privateInputs, publicInputs);
      
      // Verify proof
      spinner.text = 'Verifying test proof...';
      const isValid = await zkCrypto.verifyZKProof!(proof, publicInputs, options.circuit);
      
      if (isValid) {
        spinner.succeed('Circuit test passed!');
        console.log(chalk.green('\n✅ Circuit is working correctly'));
        console.log(chalk.blue('Proof generated and verified successfully'));
        process.exit(0);
      } else {
        spinner.fail('Circuit test failed!');
        console.log(chalk.red('\n❌ Circuit verification failed'));
        process.exit(1);
      }
      
    } catch (error) {
      spinner.fail('Circuit test failed');
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

// Create config command
program
  .command('init')
  .description('Create a sample circuit configuration file')
  .option('-o, --output <path>', 'Output configuration file path', './circuits/config.json')
  .action(async (options) => {
    try {
      const sampleConfig = {
        circuits: {
          age_verification: {
            wasmPath: './circuits/age_verification_js/age_verification.wasm',
            zkeyPath: './circuits/age_verification_final.zkey',
            verificationKeyPath: './circuits/age_verification_verification_key.json',
            provingSystem: 'groth16'
          },
          income_verification: {
            wasmPath: './circuits/income_verification_js/income_verification.wasm',
            zkeyPath: './circuits/income_verification_final.zkey',
            verificationKeyPath: './circuits/income_verification_verification_key.json',
            provingSystem: 'groth16'
          }
        },
        circuitsDir: './circuits'
      };
      
      const outputPath = path.resolve(options.output);
      
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      // Write configuration
      await fs.writeFile(outputPath, JSON.stringify(sampleConfig, null, 2));
      
      console.log(chalk.green('✅ Configuration file created!'));
      console.log(chalk.blue(`Path: ${outputPath}`));
      console.log('\nNext steps:');
      console.log('1. Compile circuits: npm run zk:compile');
      console.log('2. Setup proving keys: npm run zk:setup');
      console.log('3. Test circuits: vqp-zk test -c age_verification');
      
    } catch (error) {
      console.error(chalk.red('Error creating configuration:'), (error as Error).message);
      process.exit(1);
    }
  });

// Examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.blue('VQP ZK Proof CLI Examples'));
    console.log('==========================\n');
    
    console.log(chalk.green('1. Initialize configuration:'));
    console.log('   vqp-zk init\n');
    
    console.log(chalk.green('2. List available circuits:'));
    console.log('   vqp-zk circuits\n');
    
    console.log(chalk.green('3. Test a circuit:'));
    console.log('   vqp-zk test -c age_verification\n');
    
    console.log(chalk.green('4. Generate a proof:'));
    console.log('   vqp-zk prove -c age_verification -i \'{"age": 25}\' -p \'{"threshold": 18}\'\n');
    
    console.log(chalk.green('5. Verify a proof:'));
    console.log('   vqp-zk verify -f ./proof_age_verification_1234567890.json\n');
    
    console.log(chalk.green('6. Generate proof with custom config:'));
    console.log('   vqp-zk prove -c income_verification -i \'{"income": 75000}\' -p \'{"threshold": 50000}\' --config ./my-circuits/config.json\n');
  });

program.parse();
