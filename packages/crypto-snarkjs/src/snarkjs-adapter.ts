/**
 * SnarkJS Crypto Adapter - Implements CryptographicPort using snarkjs for ZK proofs
 * This adapter extends SoftwareCryptoAdapter to add zero-knowledge proof capabilities
 */

import { CryptographicPort, Proof, ZKProof } from '@vqp/core';
import { SoftwareCryptoAdapter, SoftwareCryptoConfig } from '@vqp/crypto-software';

// Note: snarkjs import will be dynamic to avoid bundling issues
// import * as snarkjs from 'snarkjs';

export interface SnarkjsConfig extends SoftwareCryptoConfig {
  circuits?: {
    [circuitId: string]: {
      wasmPath: string;
      zkeyPath: string;
      verificationKeyPath?: string;
      provingSystem?: 'groth16' | 'plonk';
    };
  };
  circuitsDir?: string; // Base directory for circuit files
}

export interface CircuitInfo {
  wasmPath: string;
  zkeyPath: string;
  verificationKey?: any;
  provingSystem: 'groth16' | 'plonk';
}

export class SnarkjsCryptoAdapter extends SoftwareCryptoAdapter implements CryptographicPort {
  private circuits: Map<string, CircuitInfo> = new Map();
  private snarkjs: any = null;

  constructor(private _snarkjsConfig: SnarkjsConfig = {}) {
    super(_snarkjsConfig);
    this.initializeCircuits();
  }

  /**
   * Generate a zero-knowledge proof using snarkjs
   */
  async generateZKProof(circuitId: string, inputs: any, publicInputs?: any): Promise<Proof> {
    await this.ensureSnarkjsLoaded();

    const circuit = this.circuits.get(circuitId);
    if (!circuit) {
      throw new Error(`Circuit not found: ${circuitId}`);
    }

    try {
      let proof: any;
      let publicSignals: any;

      if (circuit.provingSystem === 'groth16') {
        const { proof: groth16Proof, publicSignals: groth16Signals } =
          await this.snarkjs.groth16.fullProve(inputs, circuit.wasmPath, circuit.zkeyPath);
        proof = groth16Proof;
        publicSignals = groth16Signals;
      } else if (circuit.provingSystem === 'plonk') {
        const { proof: plonkProof, publicSignals: plonkSignals } =
          await this.snarkjs.plonk.fullProve(inputs, circuit.wasmPath, circuit.zkeyPath);
        proof = plonkProof;
        publicSignals = plonkSignals;
      } else {
        throw new Error(`Unsupported proving system: ${circuit.provingSystem}`);
      }

      const zkProof: ZKProof = {
        type: 'zk-snark',
        circuit: circuitId,
        proof: JSON.stringify(proof), // Serialize snarkjs proof object
        publicInputs: this.formatPublicInputs(publicSignals, publicInputs),
        metadata: {
          provingSystem: circuit.provingSystem,
          curve: 'bn254', // snarkjs default
          proofFormat: 'snarkjs',
        },
      };

      return zkProof;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`ZK proof generation failed: ${errorMessage}`);
    }
  }

  /**
   * Verify a zero-knowledge proof using snarkjs
   */
  async verifyZKProof(proof: Proof, publicInputs: any, circuitId?: string): Promise<boolean> {
    if (proof.type !== 'zk-snark') {
      throw new Error('Invalid proof type for ZK verification');
    }

    await this.ensureSnarkjsLoaded();

    const zkProof = proof as ZKProof;
    const targetCircuitId = circuitId || zkProof.circuit;
    const circuit = this.circuits.get(targetCircuitId);

    if (!circuit) {
      throw new Error(`Circuit not found: ${targetCircuitId}`);
    }

    try {
      const proofObject =
        typeof zkProof.proof === 'string' ? JSON.parse(zkProof.proof) : zkProof.proof;

      const publicSignals = this.extractPublicSignals(zkProof.publicInputs, publicInputs);

      let isValid: boolean;

      if (circuit.provingSystem === 'groth16') {
        if (!circuit.verificationKey) {
          throw new Error(`Verification key not loaded for circuit: ${targetCircuitId}`);
        }
        isValid = await this.snarkjs.groth16.verify(
          circuit.verificationKey,
          publicSignals,
          proofObject
        );
      } else if (circuit.provingSystem === 'plonk') {
        if (!circuit.verificationKey) {
          throw new Error(`Verification key not loaded for circuit: ${targetCircuitId}`);
        }
        isValid = await this.snarkjs.plonk.verify(
          circuit.verificationKey,
          publicSignals,
          proofObject
        );
      } else {
        throw new Error(`Unsupported proving system: ${circuit.provingSystem}`);
      }

      return isValid;
    } catch (error) {
      console.error('ZK proof verification failed:', error);
      return false;
    }
  }

  /**
   * Load a circuit for ZK proof generation/verification
   */
  async loadCircuit(circuitPath: string): Promise<void> {
    // Circuit path format: "circuitId:wasmPath:zkeyPath:vkeyPath"
    const [circuitId, wasmPath, zkeyPath, vkeyPath] = circuitPath.split(':');

    if (!circuitId || !wasmPath || !zkeyPath) {
      throw new Error('Invalid circuit path format. Expected: "id:wasm:zkey:vkey"');
    }

    await this.ensureSnarkjsLoaded();

    try {
      const circuitInfo: CircuitInfo = {
        wasmPath,
        zkeyPath,
        provingSystem: 'groth16', // Default, can be configured
      };

      // Load verification key if provided
      if (vkeyPath) {
        const fs = await import('fs');
        const vkeyContent = await fs.promises.readFile(vkeyPath, 'utf8');
        circuitInfo.verificationKey = JSON.parse(vkeyContent);
      }

      this.circuits.set(circuitId, circuitInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load circuit ${circuitId}: ${errorMessage}`);
    }
  }

  /**
   * Check if a circuit is loaded
   */
  async hasCircuit(circuitId: string): Promise<boolean> {
    return this.circuits.has(circuitId);
  }

  /**
   * List all loaded circuits
   */
  async listCircuits(): Promise<string[]> {
    return Array.from(this.circuits.keys());
  }

  /**
   * Initialize circuits from configuration
   */
  private async initializeCircuits(): Promise<void> {
    if (!this._snarkjsConfig.circuits) return;

    for (const [circuitId, config] of Object.entries(this._snarkjsConfig.circuits)) {
      try {
        const circuitPath = `${circuitId}:${config.wasmPath}:${config.zkeyPath}:${config.verificationKeyPath || ''}`;
        await this.loadCircuit(circuitPath);

        // Set proving system if specified
        const circuit = this.circuits.get(circuitId);
        if (circuit && config.provingSystem) {
          circuit.provingSystem = config.provingSystem;
        }
      } catch (error) {
        console.warn(`Failed to initialize circuit ${circuitId}:`, error);
      }
    }
  }

  /**
   * Dynamically load snarkjs to avoid bundling issues
   */
  private async ensureSnarkjsLoaded(): Promise<void> {
    if (this.snarkjs) return;

    try {
      // Dynamic import to avoid bundling snarkjs unless needed
      this.snarkjs = await import('snarkjs');
    } catch (error) {
      throw new Error(
        'snarkjs not available. Install with: npm install snarkjs\n' +
          'Note: snarkjs requires Node.js environment for file system access.'
      );
    }
  }

  /**
   * Format public inputs for proof generation
   */
  private formatPublicInputs(publicSignals: any[], providedInputs?: any): Record<string, any> {
    if (providedInputs && typeof providedInputs === 'object') {
      return { ...providedInputs, publicSignals };
    }
    return { publicSignals };
  }

  /**
   * Extract public signals for verification
   */
  private extractPublicSignals(storedInputs: Record<string, any>, providedInputs?: any): any[] {
    if (providedInputs && Array.isArray(providedInputs)) {
      return providedInputs;
    }

    if (storedInputs.publicSignals && Array.isArray(storedInputs.publicSignals)) {
      return storedInputs.publicSignals;
    }

    // Fallback: convert object values to array
    return Object.values(storedInputs).filter(
      (val) => typeof val === 'number' || typeof val === 'string'
    );
  }
}
