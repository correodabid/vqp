# @vqp/vocab-schemaorg

Schema.org vocabulary adapter for VQP (Verifiable Query Protocol).

This package enables VQP to work with Schema.org vocabularies, converting JSON-LD Schema.org types into VQP-compatible JSON Schema format for secure, privacy-preserving queries.

## Features

- **Schema.org Compatibility**: Support for common Schema.org types (Person, Organization, Product, Event, Place)
- **JSON-LD to JSON Schema Conversion**: Automatic conversion of Schema.org vocabularies to VQP format
- **Flexible URI Support**: Accepts both `schema.org:Type` and `https://schema.org/Type` formats
- **Comprehensive Type Coverage**: Includes properties and cross-references for complex data structures
- **Caching Support**: Built-in caching for improved performance
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @vqp/vocab-schemaorg
```

## Quick Start

```typescript
import { VQPService, QueryBuilder } from '@vqp/core';
import { createSchemaOrgVocabularyAdapter } from '@vqp/vocab-schemaorg';

// Create VQP service with Schema.org vocabulary support
const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  evaluationAdapter,
  createSchemaOrgVocabularyAdapter(), // Schema.org vocabulary support
  auditAdapter
);

// Query using Schema.org Person vocabulary
const query = new QueryBuilder()
  .requester('did:web:my-app.com')
  .vocabulary('schema.org:Person')
  .expression({
    'and': [
      { '>=': [{ 'var': 'age' }, 18] },
      { '!=': [{ 'var': 'name' }, ''] },
      { '==': [{ 'var': 'email_verified' }, true] }
    ]
  })
  .build();

const response = await vqpService.processQuery(query);
```

## Supported Schema.org Types

### Person
Properties for individual people:
- `name`, `givenName`, `familyName`
- `email`, `telephone`, `birthDate`, `gender`
- `nationality`, `address`, `jobTitle`
- `worksFor`, `alumniOf`, `knows`

### Organization
Properties for companies and institutions:
- `name`, `legalName`, `email`, `telephone`, `url`
- `address`, `foundingDate`, `numberOfEmployees`
- `industry`, `taxID`, `duns`, `vatID`

### Product
Properties for products and goods:
- `name`, `description`, `sku`, `gtin`, `productID`
- `brand`, `manufacturer`, `model`, `category`
- `color`, `weight`, `height`, `width`, `depth`

### Event
Properties for events and activities:
- `name`, `description`, `startDate`, `endDate`
- `location`, `organizer`, `attendee`, `eventStatus`

### Place
Properties for locations and venues:
- `name`, `address`, `geo`, `telephone`, `url`

## Usage Examples

### Person Identity Verification

```typescript
// Verify person is adult with valid email
const personQuery = new QueryBuilder()
  .vocabulary('schema.org:Person')
  .expression({
    'and': [
      { '>=': [{ 'var': 'age' }, 18] },
      { '!=': [{ 'var': 'email' }, ''] },
      { 'match': [{ 'var': 'email' }, '^[^@]+@[^@]+\\.[^@]+$'] }
    ]
  })
  .build();
```

### Organization Verification

```typescript
// Verify organization size and legal status
const orgQuery = new QueryBuilder()
  .vocabulary('https://schema.org/Organization')
  .expression({
    'and': [
      { '>': [{ 'var': 'numberOfEmployees' }, 50] },
      { '!=': [{ 'var': 'taxID' }, ''] },
      { '!=': [{ 'var': 'legalName' }, ''] }
    ]
  })
  .build();
```

### Product Information Query

```typescript
// Verify product has complete information
const productQuery = new QueryBuilder()
  .vocabulary('schema.org:Product')
  .expression({
    'and': [
      { '!=': [{ 'var': 'name' }, ''] },
      { '!=': [{ 'var': 'sku' }, ''] },
      { '>': [{ 'var': 'weight' }, 0] },
      { '!=': [{ 'var': 'manufacturer.name' }, ''] }
    ]
  })
  .build();
```

### Complex Nested Queries

```typescript
// Query person with employment information
const complexQuery = new QueryBuilder()
  .vocabulary('schema.org:Person')
  .expression({
    'and': [
      { '>=': [{ 'var': 'age' }, 25] },
      { '!=': [{ 'var': 'jobTitle' }, ''] },
      { '!=': [{ 'var': 'worksFor.name' }, ''] },
      { '>=': [{ 'var': 'worksFor.numberOfEmployees' }, 10] }
    ]
  })
  .build();
```

## Configuration

```typescript
import { createSchemaOrgVocabularyAdapter } from '@vqp/vocab-schemaorg';

const adapter = createSchemaOrgVocabularyAdapter({
  cacheTimeoutMs: 3600000, // 1 hour cache
  allowedTypes: ['Person', 'Organization', 'Product'], // Restrict allowed types
  schemaOrgVersion: '15.0', // Specify Schema.org version
  contextUrl: 'https://schema.org/docs/jsonldcontext.json' // Custom context URL
});
```

## Data Vault Format

When using Schema.org vocabularies, structure your data vault to match Schema.org JSON-LD format:

```json
{
  "@context": "https://schema.org/",
  "person": {
    "@type": "Person",
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "age": 34,
    "worksFor": {
      "@type": "Organization",
      "name": "TechCorp Inc.",
      "numberOfEmployees": 250
    }
  }
}
```

## Integration with VQP Core

The Schema.org adapter implements the standard VQP `VocabularyPort` interface:

```typescript
interface VocabularyPort {
  resolveVocabulary(uri: string): Promise<any>;
  validateAgainstVocabulary(data: any, vocabulary: any): Promise<boolean>;
  cacheVocabulary(uri: string, schema: any): Promise<void>;
}
```

This ensures seamless integration with the VQP ecosystem while providing Schema.org-specific functionality.

## URI Formats

The adapter supports multiple URI formats for Schema.org vocabularies:

- `schema.org:Person` - Short format
- `https://schema.org/Person` - Full URL format
- `schema.org:Organization` - Any Schema.org type

## Limitations

- **Subset Support**: Currently supports common Schema.org types. Full Schema.org coverage is planned for future versions.
- **Static Context**: Uses a predefined subset of Schema.org context. Dynamic context loading from schema.org is roadmapped.
- **Validation**: Basic property validation. Advanced JSON Schema validation features are in development.

## Examples

See the complete example in `examples/06-schema-org-integration.ts` for comprehensive usage patterns.

## License

MIT - See LICENSE file for details.
