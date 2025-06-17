/**
 * Default Response Mode Adapter - Handles all VQP response modes
 */

import { randomUUID } from 'node:crypto';
import {
  VQPQuery,
  ResponseModeType,
  ConsentProof,
  MutualVerificationProof,
  ObfuscationDetails,
  VQPError,
  createVQPError,
} from '../domain/types.js';
import { ResponseModePort } from '../domain/ports/secondary.js';

export interface ResponseModeAdapterConfig {
  // Default mode when none specified
  defaultMode?: ResponseModeType;

  // Consent handling
  autoConsent?: boolean; // For testing - automatically grant consent
  consentTimeout?: number; // Milliseconds to wait for consent

  // Obfuscation settings
  defaultPrecision?: number;
  defaultNoiseLevel?: number;

  // Mutual verification
  requireActualMutualVerification?: boolean; // For production - require real verification
}

export class ResponseModeAdapter implements ResponseModePort {
  constructor(private config: ResponseModeAdapterConfig = {}) {}

  async processResponseMode(
    query: VQPQuery,
    evaluationResult: any,
    actualValue: any
  ): Promise<{
    mode: ResponseModeType;
    result: any;
    value?: any;
    additionalData?: any;
  }> {
    const mode = query.responseMode?.type || this.config.defaultMode || 'strict';

    switch (mode) {
      case 'strict':
        return this.processStrict(evaluationResult);

      case 'consensual':
        return this.processConsensual(query, evaluationResult, actualValue);

      case 'reciprocal':
        return this.processReciprocal(query, evaluationResult, actualValue);

      case 'obfuscated':
        return this.processObfuscated(query, evaluationResult, actualValue);

      default:
        throw createVQPError('UNSUPPORTED_RESPONSE_MODE', `Unsupported response mode: ${mode}`);
    }
  }

  async processStrict(result: any): Promise<{ mode: 'strict'; result: any }> {
    // Strict mode: only return boolean result, no actual values
    return {
      mode: 'strict',
      result: typeof result === 'boolean' ? result : Boolean(result),
    };
  }

  async processConsensual(
    query: VQPQuery,
    result: any,
    actualValue: any
  ): Promise<{
    mode: 'consensual';
    result: any;
    value?: any;
    additionalData?: { consentProof: ConsentProof };
  }> {
    // Request consent (simplified for demo)
    const consentGranted = await this.requestConsent(query, actualValue);

    if (!consentGranted.granted) {
      throw createVQPError('CONSENT_DENIED', 'User denied consent to share actual value');
    }

    return {
      mode: 'consensual',
      result: typeof result === 'boolean' ? result : Boolean(result),
      value: actualValue,
      additionalData: {
        consentProof: consentGranted,
      },
    };
  }

  async processReciprocal(
    query: VQPQuery,
    result: any,
    actualValue: any
  ): Promise<{
    mode: 'reciprocal';
    result: any;
    value?: any;
    additionalData?: { mutualProof: MutualVerificationProof };
  }> {
    // Verify requester has provided mutual verification
    const mutualVerification = query.responseMode?.config?.mutualVerification;

    if (!mutualVerification) {
      throw createVQPError(
        'RECIPROCAL_VERIFICATION_FAILED',
        'No mutual verification data provided'
      );
    }

    // In a real implementation, this would verify the requester's proof
    const verificationResult = await this.verifyRequesterClaims(
      mutualVerification.requesterProof,
      mutualVerification.requiredClaims
    );

    if (!verificationResult.requesterVerified) {
      throw createVQPError('RECIPROCAL_VERIFICATION_FAILED', 'Requester verification failed');
    }

    return {
      mode: 'reciprocal',
      result: typeof result === 'boolean' ? result : Boolean(result),
      value: actualValue,
      additionalData: {
        mutualProof: verificationResult,
      },
    };
  }

  async processObfuscated(
    query: VQPQuery,
    result: any,
    actualValue: any
  ): Promise<{
    mode: 'obfuscated';
    result: any;
    value?: any;
    additionalData?: { obfuscationApplied: ObfuscationDetails };
  }> {
    const obfuscationConfig = query.responseMode?.config?.obfuscation;

    if (!obfuscationConfig) {
      throw createVQPError('OBFUSCATION_ERROR', 'No obfuscation configuration provided');
    }

    const obfuscatedResult = await this.applyObfuscation(actualValue, obfuscationConfig);

    return {
      mode: 'obfuscated',
      result: typeof result === 'boolean' ? result : Boolean(result),
      value: obfuscatedResult.obfuscatedValue,
      additionalData: {
        obfuscationApplied: obfuscatedResult.details,
      },
    };
  }

  // Helper methods for consent, verification, and obfuscation

  private async requestConsent(query: VQPQuery, actualValue: any): Promise<ConsentProof> {
    // Simplified consent mechanism for demo purposes
    if (this.config.autoConsent) {
      return {
        granted: true,
        timestamp: new Date().toISOString(),
        signature: `auto-consent-${randomUUID()}`,
        userAgent: 'VQP-Demo-Agent',
      };
    }

    // In a real implementation, this would show UI to user and wait for response
    // For now, we'll simulate based on justification
    const justification = query.responseMode?.config?.justification;
    const shouldGrant = justification && justification.includes('research'); // Simple heuristic

    return {
      granted: shouldGrant || false,
      timestamp: new Date().toISOString(),
      ...(shouldGrant && { signature: `consent-${randomUUID()}` }),
      userAgent: 'VQP-Demo-Agent',
    };
  }

  private async verifyRequesterClaims(
    requesterProof: any,
    requiredClaims: string[]
  ): Promise<MutualVerificationProof> {
    // Simplified verification for demo
    if (this.config.requireActualMutualVerification) {
      // In production, this would verify the cryptographic proof
      // For now, just check if proof exists
      const verified = requesterProof && requiredClaims.length > 0;

      return {
        requesterVerified: verified,
        exchangeTimestamp: new Date().toISOString(),
        verifiedClaims: verified ? requiredClaims : [],
        reciprocalProof: verified ? requesterProof : undefined,
      };
    }

    // Demo mode - always accept
    return {
      requesterVerified: true,
      exchangeTimestamp: new Date().toISOString(),
      verifiedClaims: requiredClaims,
      reciprocalProof: requesterProof,
    };
  }

  private async applyObfuscation(
    value: any,
    config: any
  ): Promise<{
    obfuscatedValue: any;
    details: ObfuscationDetails;
  }> {
    const method = config.method || 'rounding';

    if (typeof value !== 'number') {
      throw createVQPError('OBFUSCATION_ERROR', 'Obfuscation only supported for numeric values');
    }

    switch (method) {
      case 'range':
        return this.createRange(value, config.precision || this.config.defaultPrecision || 10);

      case 'noise':
        return this.addNoise(value, config.noiseLevel || this.config.defaultNoiseLevel || 0.1);

      case 'rounding':
        return this.roundToPrecision(value, config.precision || this.config.defaultPrecision || 10);

      default:
        throw createVQPError('OBFUSCATION_ERROR', `Unsupported obfuscation method: ${method}`);
    }
  }

  private async createRange(
    value: number,
    precision: number
  ): Promise<{
    obfuscatedValue: string;
    details: ObfuscationDetails;
  }> {
    const lower = Math.floor(value / precision) * precision;
    const upper = lower + precision;

    return {
      obfuscatedValue: `${lower}-${upper}`,
      details: {
        method: 'range',
        originalPrecision: 1,
        appliedPrecision: precision,
        privacyBudgetUsed: 0.1, // Simplified privacy budget calculation
      },
    };
  }

  private async addNoise(
    value: number,
    noiseLevel: number
  ): Promise<{
    obfuscatedValue: number;
    details: ObfuscationDetails;
  }> {
    // Add Laplacian noise for differential privacy
    const noise = this.laplacianNoise(0, noiseLevel);
    const noisyValue = Math.max(0, value + noise); // Ensure non-negative

    return {
      obfuscatedValue: Math.round(noisyValue * 100) / 100, // Round to 2 decimals
      details: {
        method: 'noise',
        noiseLevel,
        privacyBudgetUsed: noiseLevel,
      },
    };
  }

  private async roundToPrecision(
    value: number,
    precision: number
  ): Promise<{
    obfuscatedValue: number;
    details: ObfuscationDetails;
  }> {
    const rounded = Math.round(value / precision) * precision;

    return {
      obfuscatedValue: rounded,
      details: {
        method: 'rounding',
        originalPrecision: 1,
        appliedPrecision: precision,
        privacyBudgetUsed: 0.05, // Lower privacy cost for rounding
      },
    };
  }

  // Simple Laplacian noise generator
  private laplacianNoise(location: number, scale: number): number {
    const u = Math.random() - 0.5;
    return location - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

// Factory function for easy instantiation
export function createResponseModeAdapter(config?: ResponseModeAdapterConfig): ResponseModeAdapter {
  return new ResponseModeAdapter(config);
}
