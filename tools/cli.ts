#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { VQPSystem, VQPVerifier, QueryBuilder, VQPResponse } from '../lib/index.js';
import { readFileSync, writeFileSync } from 'fs';

const program = new Command();

program.name('vqp').description('VQP (Verifiable Query Protocol) CLI Tool').version('1.0.0');

/**
 * VQP Serve Command - Start a VQP responder server
 */
program
  .command('serve')
  .description('Start a VQP responder server')
  .option('-v, --vault <path>', 'Path to vault JSON file', './vault.json')
  .option('-p, --port <number>', 'Port to listen on', '8080')
  .option('--policies <path>', 'Path to access policies file')
  .option('--log-level <level>', 'Log level (info, debug, error)', 'info')
  .action(async (options) => {
    const spinner = ora('Starting VQP server...').start();

    try {
      const vqpSystem = new VQPSystem({
        data: {
          type: 'filesystem',
          vaultPath: options.vault,
          ...(options.policies && { policiesPath: options.policies }),
        },
        crypto: { type: 'software' },
        vocabulary: { type: 'http' },
        audit: { type: 'console', logLevel: options.logLevel },
        evaluation: {
          type: 'jsonlogic',
        },
      });

      console.log(chalk.gray(`📁 Vault: ${options.vault}`));
      console.log(chalk.gray(`🔧 Press Ctrl+C to stop\n`));

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n🛑 Shutting down VQP server...'));
        console.log(chalk.green('✅ Server stopped successfully'));
        process.exit(0);
      });

      // Keep the process alive
      await new Promise(() => {});
    } catch (error) {
      spinner.fail(chalk.red('Failed to start VQP server'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * VQP Query Command - Send queries to VQP responders
 */
program
  .command('query')
  .description('Send a query to a VQP responder')
  .requiredOption('-t, --target <url>', 'Target VQP responder URL')
  .option('-v, --vocab <vocab>', 'Vocabulary to use', 'vqp:identity:v1')
  .option('-e, --expr <expression>', 'JSONLogic expression as JSON string')
  .option('--age-check <age>', 'Quick age verification (>= age)')
  .option('--citizenship-check <country>', 'Quick citizenship check')
  .option('--income-check <amount>', 'Quick income verification (>= amount)')
  .option('--health-check', 'Quick system health check')
  .option('-o, --output <file>', 'Save response to file')
  .option('--verify', 'Verify the response automatically', true)
  .option('--requester <did>', 'Requester DID', 'did:example:cli-user')
  .action(async (options) => {
    const spinner = ora('Sending VQP query...').start();

    try {
      // Build query using QueryBuilder or custom expression
      let queryBuilder = new QueryBuilder().requester(options.requester);

      if (options.ageCheck) {
        queryBuilder = queryBuilder
          .vocabulary('vqp:identity:v1')
          .expression({ '>=': [{ var: 'age' }, parseInt(options.ageCheck)] });
      } else if (options.citizenshipCheck) {
        queryBuilder = queryBuilder
          .vocabulary('vqp:identity:v1')
          .expression({ '==': [{ var: 'citizenship' }, options.citizenshipCheck] });
      } else if (options.incomeCheck) {
        queryBuilder = queryBuilder
          .vocabulary('vqp:financial:v1')
          .expression({ '>=': [{ var: 'annual_income' }, parseInt(options.incomeCheck)] });
      } else if (options.healthCheck) {
        queryBuilder = queryBuilder
          .vocabulary('vqp:metrics:v1')
          .expression({ '==': [{ var: 'health_status' }, 'healthy'] });
      } else if (options.expr) {
        try {
          const expression = JSON.parse(options.expr);
          queryBuilder = queryBuilder.vocabulary(options.vocab).expression(expression);
        } catch (error) {
          spinner.fail(chalk.red('Invalid JSONLogic expression'));
          console.error(chalk.red('Expression must be valid JSON'));
          process.exit(1);
        }
      } else {
        spinner.fail(chalk.red('No query specified'));
        console.error(
          chalk.red(
            'Please specify a query using --age-check, --citizenship-check, --income-check, --health-check, or --expr'
          )
        );
        process.exit(1);
      }

      const query = queryBuilder.build();

      spinner.text = 'Sending query to responder...';

      // Send query using fetch (simple HTTP client)
      const response = await fetch(options.target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const vqpResponse = (await response.json()) as VQPResponse;

      spinner.succeed(chalk.green('Query completed successfully'));

      // Display results
      console.log(chalk.blue('\n📋 Query Details:'));
      console.log(chalk.gray(`   ID: ${query.id}`));
      console.log(chalk.gray(`   Vocabulary: ${query.query.vocab}`));
      console.log(chalk.gray(`   Expression: ${JSON.stringify(query.query.expr)}`));

      console.log(chalk.blue('\n📄 Response:'));
      console.log(
        chalk.gray(
          `   Result: ${chalk.bold(vqpResponse.result ? chalk.green('✅ TRUE') : chalk.red('❌ FALSE'))}`
        )
      );
      console.log(chalk.gray(`   Responder: ${vqpResponse.responder}`));
      console.log(chalk.gray(`   Timestamp: ${vqpResponse.timestamp}`));
      console.log(chalk.gray(`   Proof Type: ${vqpResponse.proof.type}`));

      // Verify response if requested
      if (options.verify) {
        const verifySpinner = ora('Verifying response...').start();

        try {
          // Create a minimal crypto adapter for verification
          const { SoftwareCryptoAdapter } = await import(
            '../lib/adapters/crypto/software-adapter.js'
          );
          const cryptoAdapter = new SoftwareCryptoAdapter();
          const verifier = new VQPVerifier(cryptoAdapter);

          const verificationResult = await verifier.verifyComplete(vqpResponse, query.id);

          if (verificationResult.overall) {
            verifySpinner.succeed(chalk.green('✅ Response verification passed'));
          } else {
            verifySpinner.fail(chalk.red('❌ Response verification failed'));
            console.log(
              chalk.gray(
                `   Cryptographic proof: ${verificationResult.cryptographicProof ? '✅' : '❌'}`
              )
            );
            console.log(chalk.gray(`   Metadata: ${verificationResult.metadata ? '✅' : '❌'}`));
          }
        } catch (error) {
          verifySpinner.fail(chalk.red('Verification error'));
          console.error(
            chalk.red('Verification failed:'),
            error instanceof Error ? error.message : error
          );
        }
      }

      // Save to file if requested
      if (options.output) {
        writeFileSync(
          options.output,
          JSON.stringify(
            {
              query,
              response: vqpResponse,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
        console.log(chalk.green(`\n💾 Response saved to ${options.output}`));
      }
    } catch (error) {
      spinner.fail(chalk.red('Query failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * VQP Verify Command - Verify a saved VQP response
 */
program
  .command('verify')
  .description('Verify a VQP response from a file')
  .requiredOption('-f, --file <path>', 'Path to response JSON file')
  .option('--query-id <id>', 'Original query ID to verify against')
  .action(async (options) => {
    const spinner = ora('Verifying VQP response...').start();

    try {
      // Read response file
      const responseData = JSON.parse(readFileSync(options.file, 'utf8'));
      const vqpResponse = responseData.response || responseData;

      // Create verifier
      const { SoftwareCryptoAdapter } = await import('../lib/adapters/crypto/software-adapter.js');
      const cryptoAdapter = new SoftwareCryptoAdapter();
      const verifier = new VQPVerifier(cryptoAdapter);

      // Verify response
      const verificationResult = await verifier.verifyComplete(vqpResponse, options.queryId);

      if (verificationResult.overall) {
        spinner.succeed(chalk.green('✅ Response verification passed'));
        console.log(chalk.blue('\n🔐 Verification Details:'));
        console.log(chalk.green(`   ✅ Cryptographic proof: Valid`));
        console.log(chalk.green(`   ✅ Metadata: Valid`));
        console.log(chalk.gray(`   📄 Response ID: ${vqpResponse.queryId}`));
        console.log(chalk.gray(`   👤 Responder: ${vqpResponse.responder}`));
        console.log(chalk.gray(`   ⏰ Timestamp: ${vqpResponse.timestamp}`));
      } else {
        spinner.fail(chalk.red('❌ Response verification failed'));
        console.log(chalk.blue('\n🔐 Verification Details:'));
        console.log(
          chalk[verificationResult.cryptographicProof ? 'green' : 'red'](
            `   ${verificationResult.cryptographicProof ? '✅' : '❌'} Cryptographic proof: ${verificationResult.cryptographicProof ? 'Valid' : 'Invalid'}`
          )
        );
        console.log(
          chalk[verificationResult.metadata ? 'green' : 'red'](
            `   ${verificationResult.metadata ? '✅' : '❌'} Metadata: ${verificationResult.metadata ? 'Valid' : 'Invalid'}`
          )
        );
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Verification failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * VQP Status Command - Check if a VQP responder is available
 */
program
  .command('status')
  .description('Check the status of a VQP responder')
  .requiredOption('-t, --target <url>', 'Target VQP responder URL')
  .action(async (options) => {
    const spinner = ora('Checking VQP responder status...').start();

    try {
      // Send a simple health check query
      const healthQuery = new QueryBuilder()
        .requester('did:example:cli-health-check')
        .vocabulary('vqp:metrics:v1')
        .expression({ '==': [{ var: 'health_status' }, 'healthy'] })
        .build();

      const response = await fetch(options.target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(healthQuery),
      });

      if (response.ok) {
        const vqpResponse = (await response.json()) as VQPResponse;
        spinner.succeed(chalk.green('✅ VQP responder is online and responding'));
        console.log(chalk.blue('\n📊 Responder Status:'));
        console.log(chalk.gray(`   🌐 Endpoint: ${options.target}`));
        console.log(chalk.gray(`   👤 Responder: ${vqpResponse.responder}`));
        console.log(chalk.gray(`   📅 Last response: ${vqpResponse.timestamp}`));
        console.log(chalk.gray(`   🔧 Proof type: ${vqpResponse.proof.type}`));
      } else {
        spinner.fail(chalk.red('❌ VQP responder is not responding correctly'));
        console.log(chalk.red(`   HTTP Status: ${response.status} ${response.statusText}`));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('❌ Cannot reach VQP responder'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

/**
 * VQP Generate Command - Generate sample files
 */
program
  .command('generate')
  .description('Generate sample configuration files')
  .option('--vault', 'Generate sample vault.json')
  .option('--policies', 'Generate sample access-policies.json')
  .option('--all', 'Generate all sample files')
  .action(async (options) => {
    if (options.vault || options.all) {
      const sampleVault = {
        personal: {
          age: 28,
          citizenship: 'US',
          has_drivers_license: true,
          email_verified: true,
          phone_verified: true,
        },
        financial: {
          annual_income: 75000,
          employment_status: 'employed',
          employment_duration_months: 24,
          has_bank_account: true,
        },
        system: {
          uptime_percentage_24h: 99.8,
          health_status: 'healthy',
          processed_events_last_hour: 1250,
        },
      };

      writeFileSync('vault.json', JSON.stringify(sampleVault, null, 2));
      console.log(chalk.green('✅ Generated vault.json'));
    }

    if (options.policies || options.all) {
      const samplePolicies = {
        allowed_paths: {
          'personal.age': ['*'],
          'personal.citizenship': ['did:web:trusted-service.com'],
          'personal.has_drivers_license': ['*'],
          'financial.annual_income': ['did:web:bank.com', 'did:web:loan-service.com'],
          'system.*': ['*'],
        },
        wildcard_paths: {
          'system.*': ['*'],
          'personal.email_verified': ['*'],
          'personal.phone_verified': ['*'],
        },
        default_policy: 'deny',
      };

      writeFileSync('access-policies.json', JSON.stringify(samplePolicies, null, 2));
      console.log(chalk.green('✅ Generated access-policies.json'));
    }

    if (!options.vault && !options.policies && !options.all) {
      console.log(chalk.yellow('Please specify --vault, --policies, or --all'));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
