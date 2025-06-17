# VQP Modular Architecture

This directory contains the modular package architecture for VQP. Each package is independently installable and provides specific functionality through the hexagonal architecture pattern.

## 🎯 Benefits of Modular Architecture

### Bundle Size Optimization
- **Include only what you need**: Applications can install specific adapters instead of the entire VQP library
- **Smaller bundle sizes**: Core logic is separated from adapter implementations
- **Better tree-shaking**: Unused adapters are automatically excluded from builds

### Flexibility & Extensibility  
- **Technology Independence**: Switch between different implementations (filesystem vs database, software crypto vs HSM)
- **Easy Testing**: Mock adapters for unit testing without external dependencies
- **Platform Adaptability**: Use different adapters for different deployment environments

### Developer Experience
- **Clear Dependencies**: Explicit adapter dependencies make architecture obvious
- **Optional Features**: Vocabulary resolution is now optional - pass vocabularies directly
- **Hexagonal Architecture**: Clean separation between business logic and external concerns

## 📦 Available Packages

### Core
- `@vqp/core` - Pure business logic, no specific adapters

### Data Adapters  
- `@vqp/data-filesystem` - File system storage
- `@vqp/data-encrypted` - Encrypted data storage

### Crypto Adapters
- `@vqp/crypto-software` - Software cryptography (Ed25519, secp256k1)
- `@vqp/crypto-snarkjs` - ZK-SNARK proof generation and verification

### Audit Adapters
- `@vqp/audit-console` - Console logging
- `@vqp/audit-file` - File logging
- `@vqp/audit-memory` - In-memory logging (testing)

### Vocabulary Resolvers (Optional)
- `@vqp/vocab-http` - HTTP resolution with caching

### Query Evaluation  
- `@vqp/evaluation-jsonlogic` - JSONLogic evaluation engine

## ✨ NEW: Response Modes v1.1

All packages now support the new Response Modes system:

- **Strict Mode**: Boolean-only responses (maximum privacy)
- **Consensual Mode**: Value disclosure with explicit user consent  
- **Reciprocal Mode**: Mutual verification between parties
- **Obfuscated Mode**: Privacy-preserving value disclosure with ranges/noise

## 🔄 Migration Guide

### Before (Monolithic)

```typescript
import { VQPSystem } from 'vqp';

const system = new VQPSystem({
  data: { type: 'filesystem', vaultPath: './vault.json' },
  crypto: { type: 'software' },
  vocabulary: { type: 'http' },
  audit: { type: 'console' }
});

const response = await system.getService().processQuery(query);
```

**Problems:**
- Bundle includes ALL adapters (filesystem, database, HSM, etc.)
- Vocabularies handled internally
- Rigid configuration

### After (Modular)

```typescript
import { VQPService, QueryBuilder } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Only include what you need
const dataAdapter = createFileSystemDataAdapter({ vaultPath: './vault.json' });
const cryptoAdapter = createSoftwareCryptoAdapter();
const auditAdapter = await createConsoleAuditAdapter();
const queryAdapter = await createJSONLogicAdapter();

const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  auditAdapter,
  queryAdapter
);

// Vocabularies handled at application level
const vocabularies = {
  'vqp:identity:v1': identitySchema,
  'vqp:financial:v1': financialSchema
};

// NEW: Response Modes support
const strictQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ '>=': [{ 'var': 'age' }, 18] })
  .strict() // Boolean-only response
  .build();

app.post('/vqp/query', async (req, res) => {
  const query = req.body;
  const vocabulary = vocabularies[query.query.vocab];
  
  if (!vocabulary) {
    return res.status(400).json({ error: 'Unsupported vocabulary' });
  }
  
  const response = await vqpService.processQuery(query, vocabulary);
  res.json(response);
});
```

**Beneficios:**
- Bundle size mínimo (solo incluye filesystem + software crypto + console audit)
- Control total sobre vocabularios
- Fácil testing con mock adapters
- Flexibilidad total

## 🛠️ Herramientas de Migración

### Analizar archivos existentes
```bash
npm run migrate src/my-file.ts
```

### Ver ejemplo de migración
```bash
npm run migrate:example
```

### Ejecutar ejemplo modular
```bash
npm run examples:modular
```

## 📋 Casos de Uso Comunes

### Aplicación Simple
```typescript
// Solo lo mínimo necesario
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';

const vqpService = new VQPService(
  createFileSystemDataAdapter({ vaultPath: './vault.json' }),
  createSoftwareCryptoAdapter(),
  createConsoleAuditAdapter(),
  createJSONLogicAdapter()
);
```

### Aplicación Enterprise
```typescript
// Adapters de alta seguridad
import { VQPService } from '@vqp/core';
import { createDatabaseDataAdapter } from '@vqp/data-database';
import { createHSMCryptoAdapter } from '@vqp/crypto-hsm';
import { createDatabaseAuditAdapter } from '@vqp/audit-database';

const vqpService = new VQPService(
  createDatabaseDataAdapter({ connectionString: process.env.DB_URL }),
  createHSMCryptoAdapter({ hsmEndpoint: process.env.HSM_URL }),
  createDatabaseAuditAdapter({ auditDB: process.env.AUDIT_DB_URL }),
  createJSONLogicAdapter()
);
```

### Aplicación Browser
```typescript
// Adapters optimizados para navegador
import { VQPService } from '@vqp/core';
import { createIndexedDBDataAdapter } from '@vqp/data-indexeddb';
import { createWebCryptoAdapter } from '@vqp/crypto-browser';

const vqpService = new VQPService(
  createIndexedDBDataAdapter({ dbName: 'vqp-vault' }),
  createWebCryptoAdapter(),
  createConsoleAuditAdapter(),
  createJSONLogicAdapter()
);
```

## 🔧 Backward Compatibility

La biblioteca actual seguirá funcionando pero está marcada como deprecated:

```typescript
// ⚠️ DEPRECATED pero sigue funcionando
import { VQPSystem } from 'vqp';

// ✅ NUEVO - Recomendado
import { VQPService } from '@vqp/core';
```

## 🗓️ Timeline

- **Q3 2025**: Packages modulares disponibles  
- **Q4 2025**: Biblioteca monolítica deprecated
- **Q1 2026**: Biblioteca monolítica removida

## ❓ FAQ

**P: ¿Tengo que migrar inmediatamente?**
R: No, la biblioteca actual seguirá funcionando. Migra cuando te convenga.

**P: ¿Los vocabularios tienen que ser manejados por la aplicación?**
R: No es obligatorio. Puedes usar `@vqp/vocab-http` si quieres resolución automática, pero la gestión directa te da más control.

**P: ¿Puedo mezclar adapters de diferentes fuentes?**
R: Sí! Mientras implementen las interfaces correctas, puedes usar adapters de cualquier fuente.

**P: ¿Esto rompe compatibilidad?**
R: No inmediatamente. Mantenemos backward compatibility mientras migras gradualmente.
