/**
 * Tests for custom vocabulary mapping functionality
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  StandardVocabularyMapping,
  FlatVocabularyMapping,
  type VocabularyMapping,
} from '../index.js';

describe('VocabularyMapping', () => {
  describe('StandardVocabularyMapping', () => {
    test('should map standard identity vocabulary correctly', () => {
      const mapping = new StandardVocabularyMapping();

      // Test identity vocabulary mapping
      assert.deepStrictEqual(mapping.toVaultPath('age', 'vqp:identity:v1'), ['personal', 'age']);

      assert.strictEqual(mapping.toVocabularyField(['personal', 'age'], 'vqp:identity:v1'), 'age');

      assert.deepStrictEqual(mapping.toVaultPath('citizenship', 'vqp:identity:v1'), [
        'personal',
        'citizenship',
      ]);
    });

    test('should map standard financial vocabulary correctly', () => {
      const mapping = new StandardVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('annual_income', 'vqp:financial:v1'), [
        'financial',
        'annual_income',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['financial', 'annual_income'], 'vqp:financial:v1'),
        'annual_income'
      );

      assert.deepStrictEqual(mapping.toVaultPath('employment_status', 'vqp:financial:v1'), [
        'financial',
        'employment_status',
      ]);
    });

    test('should map standard health vocabulary correctly', () => {
      const mapping = new StandardVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('vaccinations_completed', 'vqp:health:v1'), [
        'health',
        'vaccinations_completed',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['health', 'covid_vaccination_doses'], 'vqp:health:v1'),
        'covid_vaccination_doses'
      );
    });

    test('should map standard metrics vocabulary correctly', () => {
      const mapping = new StandardVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('uptime_percentage_24h', 'vqp:metrics:v1'), [
        'system',
        'uptime_percentage_24h',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['system', 'response_time_p95_ms'], 'vqp:metrics:v1'),
        'response_time_p95_ms'
      );
    });

    test('should handle unknown vocabulary as top-level', () => {
      const mapping = new StandardVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('custom_field', 'unknown:vocab:v1'), [
        'custom_field',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['custom_field'], 'unknown:vocab:v1'),
        'custom_field'
      );
    });

    test('should handle reverse mapping correctly', () => {
      const mapping = new StandardVocabularyMapping();

      // Test that we can map back and forth
      const originalField = 'age';
      const vocab = 'vqp:identity:v1';
      const vaultPath = mapping.toVaultPath(originalField, vocab);
      const mappedBack = mapping.toVocabularyField(vaultPath, vocab);

      assert.strictEqual(mappedBack, originalField);
    });
  });

  describe('FlatVocabularyMapping', () => {
    test('should handle simple flat fields', () => {
      const mapping = new FlatVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('age'), ['age']);

      assert.strictEqual(mapping.toVocabularyField(['age']), 'age');
    });

    test('should handle dot-notation paths', () => {
      const mapping = new FlatVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('user.profile.name'), ['user', 'profile', 'name']);

      assert.strictEqual(
        mapping.toVocabularyField(['user', 'profile', 'name']),
        'user.profile.name'
      );
    });

    test('should handle nested array paths', () => {
      const mapping = new FlatVocabularyMapping();

      assert.deepStrictEqual(mapping.toVaultPath('department.employees.0.name'), [
        'department',
        'employees',
        '0',
        'name',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['settings', 'notifications', 'email']),
        'settings.notifications.email'
      );
    });

    test('should handle round-trip mapping', () => {
      const mapping = new FlatVocabularyMapping();

      const testCases = [
        'simple_field',
        'nested.field.path',
        'deep.nested.array.0.field',
        'complex.path.with_underscores.and.numbers.123',
      ];

      for (const field of testCases) {
        const vaultPath = mapping.toVaultPath(field);
        const mappedBack = mapping.toVocabularyField(vaultPath);
        assert.strictEqual(mappedBack, field, `Round-trip failed for: ${field}`);
      }
    });
  });

  describe('Custom VocabularyMapping Implementation', () => {
    test('should support custom mapping logic', () => {
      // Create a custom mapping for employee data
      class EmployeeVocabularyMapping implements VocabularyMapping {
        toVaultPath(field: string, vocabulary?: string): string[] {
          if (vocabulary === 'company:employee:v1') {
            if (field.startsWith('personal_')) {
              return ['employee_data', 'personal', field.replace('personal_', '')];
            }
            if (field.startsWith('work_')) {
              return ['employee_data', 'work', field.replace('work_', '')];
            }
            return ['employee_data', 'general', field];
          }
          return [field];
        }

        toVocabularyField(vaultPath: string[], vocabulary?: string): string {
          if (vocabulary === 'company:employee:v1' && vaultPath[0] === 'employee_data') {
            if (vaultPath[1] === 'personal') {
              return `personal_${vaultPath[2]}`;
            }
            if (vaultPath[1] === 'work') {
              return `work_${vaultPath[2]}`;
            }
            if (vaultPath[1] === 'general') {
              return vaultPath[2];
            }
          }
          return vaultPath.join('.');
        }
      }

      const mapping = new EmployeeVocabularyMapping();

      // Test personal fields
      assert.deepStrictEqual(mapping.toVaultPath('personal_age', 'company:employee:v1'), [
        'employee_data',
        'personal',
        'age',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['employee_data', 'personal', 'age'], 'company:employee:v1'),
        'personal_age'
      );

      // Test work fields
      assert.deepStrictEqual(mapping.toVaultPath('work_department', 'company:employee:v1'), [
        'employee_data',
        'work',
        'department',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(['employee_data', 'work', 'department'], 'company:employee:v1'),
        'work_department'
      );

      // Test general fields
      assert.deepStrictEqual(mapping.toVaultPath('employee_id', 'company:employee:v1'), [
        'employee_data',
        'general',
        'employee_id',
      ]);

      assert.strictEqual(
        mapping.toVocabularyField(
          ['employee_data', 'general', 'employee_id'],
          'company:employee:v1'
        ),
        'employee_id'
      );
    });
  });
});
