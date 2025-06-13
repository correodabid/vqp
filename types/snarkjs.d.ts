// Type declarations for snarkjs
declare module 'snarkjs' {
  export interface Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export interface VerificationKey {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][];
    IC: string[][];
  }

  export namespace groth16 {
    export function fullProve(
      input: any,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ proof: Proof; publicSignals: string[] }>;

    export function verify(
      vKey: VerificationKey,
      publicSignals: string[],
      proof: Proof
    ): Promise<boolean>;

    export function setup(
      r1csPath: string,
      ptauPath: string,
      zkeyPath: string
    ): Promise<void>;
  }

  export namespace plonk {
    export function fullProve(
      input: any,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ proof: Proof; publicSignals: string[] }>;

    export function verify(
      vKey: VerificationKey,
      publicSignals: string[],
      proof: Proof
    ): Promise<boolean>;

    export function setup(
      r1csPath: string,
      ptauPath: string,
      zkeyPath: string
    ): Promise<void>;
  }

  export namespace powersoftau {
    export function newAccumulator(
      curve: string,
      power: number,
      fileName: string,
      logger?: any
    ): Promise<void>;

    export function contribute(
      oldPtauFilename: string,
      newPTauFilename: string,
      name: string,
      entropy?: string,
      logger?: any
    ): Promise<void>;

    export function preparePhase2(
      oldPtauFilename: string,
      newPTauFilename: string,
      logger?: any
    ): Promise<void>;
  }

  export namespace zKey {
    export function contribute(
      oldZkeyFilename: string,
      newZkeyFilename: string,
      name: string,
      entropy?: string,
      logger?: any
    ): Promise<void>;

    export function exportVerificationKey(
      zkeyFilename: string
    ): Promise<VerificationKey>;
  }
}
