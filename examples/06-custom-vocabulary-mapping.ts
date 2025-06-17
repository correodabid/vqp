/**
 * VQP Example 6: Custom Vocabulary Mapping
 *
 * This example demonstrates how to create custom vocabulary mappings
 * for non-standard vault structures and custom vocabularies.
 */

import {
  VQPService,
  VocabularyMapping,
  QueryBuilder,
  createResponseModeAdapter,
  VocabularyPort,
} from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

/**
 * Custom mapping for a company's employee management system
 * Vault structure: { employees: { [id]: { profile: {...}, permissions: {...} } } }
 */
class EmployeeVocabularyMapping implements VocabularyMapping {
  constructor(private employeeId: string) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    console.log(`🔍 EmployeeMapping.toVaultPath: field="${field}", vocab="${vocabularyUri}"`);

    if (vocabularyUri === 'company:employee:v1') {
      // Map employee fields to specific employee record
      if (field.startsWith('profile.')) {
        const profileField = field.substring(8); // Remove 'profile.'
        const path = ['employees', this.employeeId, 'profile', profileField];
        console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
        return path;
      }

      if (field.startsWith('permissions.')) {
        const permField = field.substring(12); // Remove 'permissions.'
        const path = ['employees', this.employeeId, 'permissions', permField];
        console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
        return path;
      }

      // Direct employee fields
      const path = ['employees', this.employeeId, field];
      console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
      return path;
    }

    // Default behavior for other vocabularies
    const path = field.includes('.') ? field.split('.') : [field];
    console.log(`  → Default mapping to vault path: ${JSON.stringify(path)}`);
    return path;
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    if (vocabularyUri === 'company:employee:v1' && path.length >= 3 && path[0] === 'employees') {
      // path = ['employees', 'emp-123', 'profile', 'level'] → 'profile.level'
      if (path[2] === 'profile' && path.length === 4) {
        return `profile.${path[3]}`;
      }
      if (path[2] === 'permissions' && path.length === 4) {
        return `permissions.${path[3]}`;
      }
      if (path.length === 3) {
        return path[2]; // Direct field
      }
    }

    // Default behavior
    return path.join('.');
  }
}

/**
 * Custom mapping for IoT device system
 * Vault structure: { devices: { [id]: { sensors: {...}, config: {...} } } }
 */
class IoTDeviceMapping implements VocabularyMapping {
  constructor(private deviceId: string) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    console.log(`🔍 IoTMapping.toVaultPath: field="${field}", vocab="${vocabularyUri}"`);

    if (vocabularyUri === 'iot:device:v1') {
      // Map device fields to specific device record
      if (field.startsWith('sensor.')) {
        const sensorField = field.substring(7); // Remove 'sensor.'
        const path = ['devices', this.deviceId, 'sensors', sensorField];
        console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
        return path;
      }

      if (field.startsWith('config.')) {
        const configField = field.substring(7); // Remove 'config.'
        const path = ['devices', this.deviceId, 'config', configField];
        console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
        return path;
      }

      // Direct device fields
      const path = ['devices', this.deviceId, field];
      console.log(`  → Mapped to vault path: ${JSON.stringify(path)}`);
      return path;
    }

    // Default behavior
    const path = field.includes('.') ? field.split('.') : [field];
    console.log(`  → Default mapping to vault path: ${JSON.stringify(path)}`);
    return path;
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    if (vocabularyUri === 'iot:device:v1' && path.length >= 3 && path[0] === 'devices') {
      // path = ['devices', 'device-abc123', 'sensors', 'temperature'] → 'sensor.temperature'
      if (path[2] === 'sensors' && path.length === 4) {
        return `sensor.${path[3]}`;
      }
      if (path[2] === 'config' && path.length === 4) {
        return `config.${path[3]}`;
      }
      if (path.length === 3) {
        return path[2]; // Direct field
      }
    }

    // Default behavior
    return path.join('.');
  }
}

async function main() {
  console.log('📋 Sample vault structures needed:');
  console.log(' employee-vault.json:');
  console.log(
    JSON.stringify(
      {
        employees: {
          'emp-123': {
            profile: {
              name: 'John Doe',
              department: 'Engineering',
              level: 'senior',
            },
            permissions: {
              admin: true,
              database_access: true,
            },
            years_experience: 8,
          },
        },
      },
      null,
      2
    )
  );

  console.log(' iot-vault.json:');
  console.log(
    JSON.stringify(
      {
        devices: {
          'device-abc123': {
            sensors: {
              temperature: 22.5,
              humidity: 45.2,
              battery_level: 85,
            },
            config: {
              enabled: true,
              reporting_interval: 300,
            },
            last_seen_minutes: 5,
          },
        },
      },
      null,
      2
    )
  );

  console.log('\n🏢 Custom Vocabulary Mapping Demo');

  // --- Employee System Example ---
  console.log('\n--- Employee Management System ---');

  const employeeMapping = new EmployeeVocabularyMapping('emp-123');

  // Custom employee vocabulary
  const employeeVocabulary = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Company Employee Vocabulary v1',
    type: 'object',
    properties: {
      'profile.name': { type: 'string' },
      'profile.department': { type: 'string' },
      'profile.level': { type: 'string', enum: ['junior', 'mid', 'senior', 'principal'] },
      'permissions.admin': { type: 'boolean' },
      'permissions.database_access': { type: 'boolean' },
      years_experience: { type: 'integer', minimum: 0 },
    },
  };

  // Employee vocabulary adapter
  class EmployeeVocabularyAdapter implements VocabularyPort {
    async resolveVocabulary(uri: string): Promise<any> {
      if (uri === 'company:employee:v1') {
        return employeeVocabulary;
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
      return uri === 'company:employee:v1';
    }
  }

  // Create VQP service with custom employee mapping
  const employeeService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/employee-vault.json',
    }),
    await createSoftwareCryptoAdapter(),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    new EmployeeVocabularyAdapter(),
    {
      vocabularyMapping: employeeMapping,
      allowedVocabularies: ['company:employee:v1'],
    }
  );

  // Employee query using custom vocabulary
  const employeeQuery = new QueryBuilder()
    .requester('did:web:hr-company.com')
    .vocabulary('company:employee:v1')
    .expression({
      and: [
        { '==': [{ var: 'profile.level' }, 'senior'] },
        { '==': [{ var: 'permissions.admin' }, true] },
        { '>=': [{ var: 'years_experience' }, 5] },
      ],
    })
    .build();

  console.log('📤 Employee Query:', employeeQuery.query.expr);

  try {
    const employeeResponse = await employeeService.processQuery(employeeQuery, {
      'company:employee:v1': employeeVocabulary,
    });

    console.log('✅ Employee Result:', employeeResponse.result);
    console.log('🔐 Proof type:', employeeResponse.proof.type);
  } catch (error) {
    console.log('❌ Employee query failed:', error.message);
  }

  // --- IoT Device System Example ---
  console.log('\n--- IoT Device System ---');

  const deviceMapping = new IoTDeviceMapping('device-abc123');

  // Custom IoT vocabulary
  const iotVocabulary = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'IoT Device Vocabulary v1',
    type: 'object',
    properties: {
      'sensor.temperature': { type: 'number' },
      'sensor.humidity': { type: 'number', minimum: 0, maximum: 100 },
      'sensor.battery_level': { type: 'number', minimum: 0, maximum: 100 },
      'config.enabled': { type: 'boolean' },
      'config.reporting_interval': { type: 'integer', minimum: 1 },
      last_seen_minutes: { type: 'integer', minimum: 0 },
    },
  };

  // IoT vocabulary adapter
  class IoTVocabularyAdapter implements VocabularyPort {
    async resolveVocabulary(uri: string): Promise<any> {
      if (uri === 'iot:device:v1') {
        return iotVocabulary;
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
      return uri === 'iot:device:v1';
    }
  }

  // Create VQP service with custom IoT mapping
  const deviceService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/iot-vault.json',
    }),
    await createSoftwareCryptoAdapter(),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    new IoTVocabularyAdapter(),
    {
      vocabularyMapping: deviceMapping,
      allowedVocabularies: ['iot:device:v1'],
    }
  );

  // IoT device query
  const deviceQuery = new QueryBuilder()
    .requester('did:web:iot-company.com')
    .vocabulary('iot:device:v1')
    .expression({
      and: [
        { '>=': [{ var: 'sensor.battery_level' }, 20] },
        { '<=': [{ var: 'last_seen_minutes' }, 60] },
        { '==': [{ var: 'config.enabled' }, true] },
      ],
    })
    .build();

  console.log('📤 Device Query:', deviceQuery.query.expr);

  try {
    const deviceResponse = await deviceService.processQuery(deviceQuery, {
      'iot:device:v1': iotVocabulary,
    });

    console.log('✅ Device Result:', deviceResponse.result);
    console.log('🔐 Proof type:', deviceResponse.proof.type);
  } catch (error) {
    console.log('❌ Device query failed:', error.message);
  }

  console.log('\n🎯 Key Benefits of Custom Vocabulary Mapping:');
  console.log('• Map vocabulary fields to complex vault structures');
  console.log('• Support domain-specific data organization');
  console.log('• Enable flexible field naming in vocabularies');
  console.log('• Maintain data sovereignty with custom layouts');
  console.log('• Support multi-tenant data isolation');
}

// Run the example
main().catch(console.error);
