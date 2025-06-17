/**
 * Response Mode Port - Handles different response modes for VQP queries
 */

import {
  VQPQuery,
  VQPResponse,
  ResponseModeType,
  ConsentProof,
  MutualVerificationProof,
  ObfuscationDetails,
} from '../types.js';

// Query evaluation result before applying response mode
export interface QueryEvaluation {
  booleanResult: boolean;
  actualValue: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Consent request for consensual mode
export interface ConsentRequest {
  query: object;
  justification?: string;
  requestedValue: any;
  requester: string;
  timestamp: string;
}

// Response Mode Port interface
export interface ResponseModePort {
  processResponseMode(
    query: VQPQuery,
    evaluation: QueryEvaluation
  ): Promise<{
    mode: ResponseModeType;
    result: boolean | number | string | null;
    value?: any;
    consentProof?: ConsentProof;
    mutualProof?: MutualVerificationProof;
    obfuscationApplied?: ObfuscationDetails;
  }>;
}

// Consent Management Port
export interface ConsentPort {
  requestConsent(request: ConsentRequest): Promise<ConsentProof>;
}

// Obfuscation Port
export interface ObfuscationPort {
  applyObfuscation(
    value: any,
    method: 'range' | 'noise' | 'rounding',
    config: any
  ): Promise<{
    obfuscatedValue: any;
    details: ObfuscationDetails;
  }>;
}

// Mutual Verification Port
export interface MutualVerificationPort {
  verifyRequesterClaims(
    requesterProof: any,
    requiredClaims: string[]
  ): Promise<MutualVerificationProof>;
}
