/**
 * Primary Ports (Driving Side)
 * These define how external actors interact with VQP
 */

import { VQPQuery, VQPResponse, VQPConfig, SystemStatus } from '../types.js';

/**
 * Query Port - How queries are received and processed
 */
export interface QueryPort {
  receiveQuery(query: VQPQuery): Promise<VQPResponse>;
  validateQuery(query: VQPQuery): Promise<boolean>;
}

/**
 * Management Port - How the system is configured and monitored
 */
export interface ManagementPort {
  updateConfiguration(config: Partial<VQPConfig>): Promise<void>;
  getStatus(): Promise<SystemStatus>;
  rotateKeys(): Promise<void>;
  shutdown(): Promise<void>;
}
