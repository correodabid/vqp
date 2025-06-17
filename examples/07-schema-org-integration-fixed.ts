/**
 * Schema.org VQP Integration Example
 *
 * This example demonstrates how to use Schema.org vocabularies with VQP
 * for common use cases like person verification, organization validation,
 * and product information queries.
 */

import { VQPService, QueryBuilder, createResponseModeAdapter } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createSchemaOrgVocabularyAdapter } from '@vqp/vocab-schemaorg';

/**
 * Custom vocabulary mapping for Schema.org to handle the different vault structure
 */
class SchemaOrgVocabularyMapping {
  toVaultPath(field: string, vocabularyUri?: string): string[] {
    // Handle nested properties like "worksFor.name"
    if (field.includes('.')) {
      const parts = field.split('.');
      return this.mapFieldToVaultPath(parts, vocabularyUri);
    }

    // Map vocabulary fields to vault structure
    if (vocabularyUri) {
      if (vocabularyUri.includes('Person')) {
        return ['person', field];
      } else if (vocabularyUri.includes('Organization')) {
        return ['organization', field];
      } else if (vocabularyUri.includes('Product')) {
        return ['product', field];
      } else if (vocabularyUri.includes('Event')) {
        return ['event', field];
      } else if (vocabularyUri.includes('Place')) {
        return ['place', field];
      }
    }

    // Fallback: try to find the field in any top-level object
    return [field];
  }

  private mapFieldToVaultPath(parts: string[], vocabularyUri?: string): string[] {
    const [firstPart, ...remainingParts] = parts;

    // For nested properties like "worksFor.name", map the first part to vault structure
    if (vocabularyUri && vocabularyUri.includes('Person')) {
      if (firstPart === 'worksFor') {
        return ['person', 'worksFor', ...remainingParts];
      } else if (firstPart === 'address') {
        return ['person', 'address', ...remainingParts];
      }
      return ['person', ...parts];
    }

    return parts;
  }

  toVocabularyField(path: string[], vocabularyUri?: string): string {
    // Remove the first path segment (entity type) for Schema.org vocabularies
    if (
      path.length > 1 &&
      ['person', 'organization', 'product', 'event', 'place'].includes(path[0])
    ) {
      return path.slice(1).join('.');
    }
    return path.join('.');
  }
}

async function main() {
  console.log('🌐 Schema.org VQP Integration Example\n');

  // Create VQP service with Schema.org vocabulary support
  const vqpService = new VQPService(
    createFileSystemDataAdapter({
      vaultPath: './examples/schema-org-vault.json',
    }),
    createSoftwareCryptoAdapter({}),
    await createConsoleAuditAdapter(),
    await createJSONLogicAdapter(),
    createResponseModeAdapter({
      autoConsent: true,
      defaultMode: 'strict',
    }),
    createSchemaOrgVocabularyAdapter(),
    {
      vocabularyMapping: new SchemaOrgVocabularyMapping(),
    }
  );

  console.log('✅ VQP Service initialized with Schema.org vocabulary support\n');

  // Example 1: Person Identity Verification using Schema.org
  console.log('📝 Example 1: Person Identity Verification\n');

  const personQuery = new QueryBuilder()
    .requester('did:web:hr-system.company.com')
    .vocabulary('schema.org:Person')
    .expression({
      and: [
        { '>=': [{ var: 'age' }, 18] },
        { '!=': [{ var: 'name' }, ''] },
        { '==': [{ var: 'email_verified' }, true] },
      ],
    })
    .build();

  console.log('Query:', JSON.stringify(personQuery.query, null, 2));

  try {
    const personResponse = await vqpService.processQuery(personQuery);
    console.log('✅ Person verification response:', JSON.stringify(personResponse, null, 2));
  } catch (error) {
    console.log('❌ Person verification failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 2: Organization Verification using Schema.org
  console.log('🏢 Example 2: Organization Verification\n');

  const orgQuery = new QueryBuilder()
    .requester('did:web:compliance.auditor.com')
    .vocabulary('schema.org:Organization')
    .expression({
      and: [
        { '>': [{ var: 'numberOfEmployees' }, 50] },
        { '!=': [{ var: 'taxID' }, ''] },
        { '!=': [{ var: 'legalName' }, ''] },
      ],
    })
    .build();

  console.log('Query:', JSON.stringify(orgQuery.query, null, 2));

  try {
    const orgResponse = await vqpService.processQuery(orgQuery);
    console.log('✅ Organization verification response:', JSON.stringify(orgResponse, null, 2));
  } catch (error) {
    console.log('❌ Organization verification failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 3: Product Information Query using Schema.org
  console.log('📦 Example 3: Product Information Query\n');

  const productQuery = new QueryBuilder()
    .requester('did:web:marketplace.ecommerce.com')
    .vocabulary('https://schema.org/Product')
    .expression({
      and: [
        { '!=': [{ var: 'name' }, ''] },
        { '!=': [{ var: 'sku' }, ''] },
        { '>': [{ var: 'weight' }, 0] },
        { '!=': [{ var: 'manufacturer' }, null] },
      ],
    })
    .build();

  console.log('Query:', JSON.stringify(productQuery.query, null, 2));

  try {
    const productResponse = await vqpService.processQuery(productQuery);
    console.log('✅ Product verification response:', JSON.stringify(productResponse, null, 2));
  } catch (error) {
    console.log('❌ Product verification failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 4: Event Attendance Verification
  console.log('🎟️ Example 4: Event Attendance Verification\n');

  const eventQuery = new QueryBuilder()
    .requester('did:web:event.organizer.com')
    .vocabulary('schema.org:Event')
    .expression({
      and: [
        { '>=': [{ var: 'attendeeCount' }, 1] },
        { '==': [{ var: 'eventStatus' }, 'EventScheduled'] },
        { '!=': [{ var: 'location' }, null] },
      ],
    })
    .build();

  console.log('Query:', JSON.stringify(eventQuery.query, null, 2));

  try {
    const eventResponse = await vqpService.processQuery(eventQuery);
    console.log('✅ Event verification response:', JSON.stringify(eventResponse, null, 2));
  } catch (error) {
    console.log('❌ Event verification failed:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Example 5: Complex Query with Nested Schema.org Properties
  console.log('🔗 Example 5: Complex Nested Property Query\n');

  const complexQuery = new QueryBuilder()
    .requester('did:web:background.check.com')
    .vocabulary('schema.org:Person')
    .expression({
      and: [
        { '>=': [{ var: 'age' }, 25] },
        { '!=': [{ var: 'jobTitle' }, ''] },
        { '!=': [{ var: 'worksFor.name' }, ''] },
        { '>=': [{ var: 'worksFor.numberOfEmployees' }, 10] },
      ],
    })
    .build();

  console.log('Query:', JSON.stringify(complexQuery.query, null, 2));

  try {
    const complexResponse = await vqpService.processQuery(complexQuery);
    console.log('✅ Complex query response:', JSON.stringify(complexResponse, null, 2));
  } catch (error) {
    console.log('❌ Complex query failed:', error);
  }

  console.log('\n🎉 Schema.org VQP Integration Examples Complete!');
}

// Utility function to demonstrate vocabulary schema inspection
async function inspectSchemaOrgVocabularies() {
  console.log('\n🔍 Schema.org Vocabulary Inspection\n');

  const vocabAdapter = createSchemaOrgVocabularyAdapter();

  const vocabularies = ['Person', 'Organization', 'Product', 'Event', 'Place'];

  for (const vocab of vocabularies) {
    console.log(`📋 Schema.org ${vocab} Properties:`);
    try {
      const schema = await vocabAdapter.resolveVocabulary(`schema.org:${vocab}`);
      const properties = Object.keys(schema.properties || {});
      console.log(`   Available properties: ${properties.join(', ')}`);
      console.log(`   Total properties: ${properties.length}\n`);
    } catch (error) {
      console.log(`   ❌ Error loading ${vocab}: ${error}\n`);
    }
  }
}

// Run the examples
import { fileURLToPath } from 'node:url';

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => inspectSchemaOrgVocabularies())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}

export { main, inspectSchemaOrgVocabularies };
