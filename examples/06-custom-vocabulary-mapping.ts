/**
 * Example: Custom Vocabulary Mapping
 *
 * This example demonstrates how to create custom vocabulary mappings
 * for non-standard vault structures and custom vocabularies.
 */

import { VQPService, VocabularyMapping, QueryBuilder } from '@vqp/core';
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
    if (vocabularyUri === 'company:employee:v1') {
      // Map employee fields to specific employee record
      if (field.startsWith('profile.')) {
        const profileField = field.substring(8); // Remove 'profile.'
        return ['employees', this.employeeId, 'profile', profileField];
      }

      if (field.startsWith('permissions.')) {
        const permField = field.substring(12); // Remove 'permissions.'
        return ['employees', this.employeeId, 'permissions', permField];
      }

      // Direct employee fields
      return ['employees', this.employeeId, field];
    }

    // Default behavior for other vocabularies
    return field.includes('.') ? field.split('.') : [field];
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    if (vocabularyUri === 'company:employee:v1' && path.length >= 3) {
      if (path[0] === 'employees' && path[1] === this.employeeId) {
        if (path[2] === 'profile' && path.length >= 4) {
          return `profile.${path.slice(3).join('.')}`;
        }
        if (path[2] === 'permissions' && path.length >= 4) {
          return `permissions.${path.slice(3).join('.')}`;
        }
        return path.slice(2).join('.');
      }
    }

    return path.join('.');
  }
}

/**
 * Custom mapping for IoT device data
 * Vault structure: { devices: { [deviceId]: { sensors: {...}, config: {...} } } }
 */
class IoTDeviceMapping implements VocabularyMapping {
  constructor(private deviceId: string) {}

  toVaultPath(field: string, vocabularyUri?: string): string[] {
    if (vocabularyUri === 'iot:device:v1') {
      if (field.startsWith('sensor.')) {
        const sensorField = field.substring(7);
        return ['devices', this.deviceId, 'sensors', sensorField];
      }

      if (field.startsWith('config.')) {
        const configField = field.substring(7);
        return ['devices', this.deviceId, 'config', configField];
      }

      return ['devices', this.deviceId, field];
    }

    return field.includes('.') ? field.split('.') : [field];
  }

  toVocabularyField(path: string[]): string {
    if (path.length >= 3 && path[0] === 'devices' && path[1] === this.deviceId) {
      if (path[2] === 'sensors' && path.length >= 4) {
        return `sensor.${path.slice(3).join('.')}`;
      }
      if (path[2] === 'config' && path.length >= 4) {
        return `config.${path.slice(3).join('.')}`;
      }
      return path.slice(2).join('.');
    }

    return path.join('.');
  }
}

async function demonstrateCustomMappings() {
  console.log('🏢 Custom Vocabulary Mapping Demo\n');

  // Example 1: Employee Management System
  console.log('--- Employee Management System ---');

  const employeeMapping = new EmployeeVocabularyMapping('emp-123');
  // Create VQP service with custom employee mapping
  const employeeService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/employee-vault.json',
    }),
    await createSoftwareCryptoAdapter({
      defaultKeyId: 'employee-system-key',
    }),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    undefined, // No vocabulary resolver
    {
      vocabularyMapping: employeeMapping,
      allowedVocabularies: ['company:employee:v1'],
    }
  );

  // Custom employee vocabulary - using the dot notation as property names
  const employeeVocabulary = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Company Employee Vocabulary v1',
    type: 'object',
    properties: {
      'profile.name': { type: 'string' },
      'profile.department': { type: 'string' },
      'profile.level': { type: 'string', enum: ['junior', 'mid', 'senior'] },
      'permissions.admin': { type: 'boolean' },
      'permissions.database_access': { type: 'boolean' },
      years_experience: { type: 'integer' },
    },
  };

  // Query employee data
  const employeeQuery = new QueryBuilder()
    .requester('did:web:hr-system.company.com')
    .vocabulary('company:employee:v1')
    .expression({
      and: [
        { '==': [{ var: 'profile.level' }, 'senior'] },
        { '==': [{ var: 'permissions.admin' }, true] },
        { '>=': [{ var: 'years_experience' }, 5] },
      ],
    })
    .build();

  try {
    const employeeResponse = await employeeService.processQuery(employeeQuery, {
      'company:employee:v1': employeeVocabulary,
    });
    console.log('Employee query result:', employeeResponse.result);
  } catch (error) {
    console.log('Employee query failed:', (error as Error).message);
  }

  // Example 2: IoT Device System
  console.log('\n--- IoT Device System ---');

  const deviceMapping = new IoTDeviceMapping('device-abc123');
  const deviceService = new VQPService(
    await createFileSystemDataAdapter({
      vaultPath: './examples/iot-vault.json',
    }),
    await createSoftwareCryptoAdapter({
      defaultKeyId: 'iot-system-key',
    }),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    undefined,
    {
      vocabularyMapping: deviceMapping,
      allowedVocabularies: ['iot:device:v1'],
    }
  );

  // Custom IoT vocabulary
  const iotVocabulary = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'IoT Device Vocabulary v1',
    type: 'object',
    properties: {
      'sensor.temperature': { type: 'number' },
      'sensor.humidity': { type: 'number' },
      'sensor.battery_level': { type: 'number', minimum: 0, maximum: 100 },
      'config.enabled': { type: 'boolean' },
      'config.reporting_interval': { type: 'integer' },
      last_seen_minutes: { type: 'integer' },
    },
  };

  // Query device status
  const deviceQuery = new QueryBuilder()
    .requester('did:web:iot-management.company.com')
    .vocabulary('iot:device:v1')
    .expression({
      and: [
        { '>=': [{ var: 'sensor.battery_level' }, 20] },
        { '<=': [{ var: 'last_seen_minutes' }, 60] },
        { '==': [{ var: 'config.enabled' }, true] },
      ],
    })
    .build();

  try {
    const deviceResponse = await deviceService.processQuery(deviceQuery, {
      'iot:device:v1': iotVocabulary,
    });
    console.log('Device query result:', deviceResponse.result);
  } catch (error) {
    console.log('Device query failed:', (error as Error).message);
  }
}

// Sample vault files needed for this example
const sampleEmployeeVault = {
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
};

const sampleIoTVault = {
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
};

console.log('📋 Sample vault structures needed:');
console.log('\n employee-vault.json:');
console.log(JSON.stringify(sampleEmployeeVault, null, 2));
console.log('\n iot-vault.json:');
console.log(JSON.stringify(sampleIoTVault, null, 2));

// Run the demo
demonstrateCustomMappings().catch(console.error);
