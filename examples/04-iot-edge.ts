/**
 * VQP Example 4: IoT/Edge Device
 *
 * Demonstrates VQP on resource-constrained devices:
 * - Lightweight in-memory data storage
 * - Sensor data queries
 * - Minimal resource usage
 * - Real-time response capabilities
 */

import { VQPService, QueryBuilder, createResponseModeAdapter, VocabularyPort } from '@vqp/core';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createMemoryAuditAdapter } from '@vqp/audit-memory';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import type { DataAccessPort } from '@vqp/core';

// Lightweight in-memory data adapter for IoT
class IoTSensorDataAdapter implements DataAccessPort {
  private sensorData: Record<string, any>;

  constructor() {
    // Simulate real-time sensor data
    this.sensorData = {
      temperature_celsius: 22.5 + (Math.random() - 0.5) * 10,
      humidity_percentage: 45 + Math.random() * 40,
      motion_detected: Math.random() > 0.7,
      door_open: Math.random() > 0.8,
      battery_percentage: 85 + Math.random() * 15,
      last_seen_minutes: Math.floor(Math.random() * 5),
      device_id: 'sensor-001',
      location: 'living-room',
    };
  }

  async getData(path: string[]): Promise<any> {
    const key = path.join('.');
    return this.sensorData[key] ?? this.getNestedValue(this.sensorData, path);
  }

  async validateDataAccess(path: string[], requester: string): Promise<boolean> {
    // Simple access control - allow trusted home automation systems
    const trustedSystems = [
      'did:web:home-automation.local',
      'did:web:security-system.local',
      'did:web:energy-management.local',
    ];

    return trustedSystems.includes(requester);
  }

  async hasData(path: string[]): Promise<boolean> {
    const key = path.join('.');
    return key in this.sensorData || this.getNestedValue(this.sensorData, path) !== undefined;
  }

  private getNestedValue(obj: any, path: string[]): any {
    return path.reduce((current, key) => current?.[key], obj);
  }

  // Update sensor data (simulate real sensors)
  updateSensorData(): void {
    this.sensorData.temperature_celsius = 22.5 + (Math.random() - 0.5) * 10;
    this.sensorData.humidity_percentage = 45 + Math.random() * 40;
    this.sensorData.motion_detected = Math.random() > 0.7;
    this.sensorData.battery_percentage = Math.max(0, this.sensorData.battery_percentage - 0.1);
    this.sensorData.last_seen_minutes = 0; // Reset on update
  }
}

const IOT_VOCAB = {
  type: 'object',
  properties: {
    temperature_celsius: { type: 'number' },
    humidity_percentage: { type: 'number', minimum: 0, maximum: 100 },
    motion_detected: { type: 'boolean' },
    door_open: { type: 'boolean' },
    battery_percentage: { type: 'number', minimum: 0, maximum: 100 },
    last_seen_minutes: { type: 'integer', minimum: 0 },
  },
};

// Simple vocabulary adapter for IoT
class IoTVocabularyAdapter implements VocabularyPort {
  async resolveVocabulary(uri: string): Promise<any> {
    if (uri === 'vqp:iot:v1') {
      return IOT_VOCAB;
    }
    throw new Error(`Unknown vocabulary: ${uri}`);
  }

  async validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean> {
    return true; // Simplified validation
  }

  async cacheVocabulary(uri: string, schema: any): Promise<void> {
    // No-op for this example
  }

  async isVocabularyAllowed(uri: string): Promise<boolean> {
    return uri === 'vqp:iot:v1';
  }
}

async function main() {
  console.log('🏠 VQP Example: IoT/Edge Device');

  // Setup lightweight IoT VQP service
  const iotDataAdapter = new IoTSensorDataAdapter();
  const memoryAuditAdapter = await createMemoryAuditAdapter({ maxEntries: 100 });

  const vqpService = new VQPService(
    iotDataAdapter,
    await createSoftwareCryptoAdapter(),
    memoryAuditAdapter,
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    new IoTVocabularyAdapter()
  );

  // Simulate IoT queries from home automation system
  const queries = [
    // Environmental comfort check
    {
      name: 'Environmental Comfort',
      query: new QueryBuilder()
        .requester('did:web:home-automation.local')
        .vocabulary('vqp:iot:v1')
        .expression({
          and: [
            { '>=': [{ var: 'temperature_celsius' }, 18] },
            { '<=': [{ var: 'temperature_celsius' }, 25] },
            { '<=': [{ var: 'humidity_percentage' }, 60] },
          ],
        })
        .build(),
    },

    // Security status
    {
      name: 'Security Status',
      query: new QueryBuilder()
        .requester('did:web:security-system.local')
        .vocabulary('vqp:iot:v1')
        .expression({
          and: [{ not: [{ var: 'motion_detected' }] }, { not: [{ var: 'door_open' }] }],
        })
        .build(),
    },

    // Device health
    {
      name: 'Device Health',
      query: new QueryBuilder()
        .requester('did:web:energy-management.local')
        .vocabulary('vqp:iot:v1')
        .expression({
          and: [
            { '>=': [{ var: 'battery_percentage' }, 20] },
            { '<=': [{ var: 'last_seen_minutes' }, 5] },
          ],
        })
        .build(),
    },
  ];

  // Process queries in real-time
  for (const { name, query } of queries) {
    try {
      // Update sensor data (simulate real-time)
      iotDataAdapter.updateSensorData();

      const startTime = Date.now();
      const response = await vqpService.processQuery(query, {
        'vqp:iot:v1': IOT_VOCAB,
      });
      const duration = Date.now() - startTime;

      console.log(`\n📊 ${name}:`);
      console.log(`   Result: ${response.result}`);
      console.log(`   Response time: ${duration}ms`);
      console.log(
        `   Verified: ${response.proof.type === 'signature' ? !!(response.proof as any).signature : 'N/A'}`
      );
    } catch (error) {
      console.error(`❌ ${name} failed:`, error.message);
    }
  }

  // Show audit log
  const auditEntries = await memoryAuditAdapter.getAuditTrail({});
  console.log(`\n📝 Audit log: ${auditEntries.length} entries`);

  // Show memory usage (simulate)
  const memoryUsage = process.memoryUsage();
  console.log(`\n💾 Memory usage: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS`);

  console.log('\n✅ IoT VQP service operational - efficient and privacy-preserving!');
}

// Run the example
main().catch(console.error);
