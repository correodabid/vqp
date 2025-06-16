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

## 📦 Packages Disponibles

### Core
- `@vqp/core` - Lógica de negocio pura, sin adapters específicos

### Data Adapters  
- `@vqp/data-filesystem` - Almacenamiento en sistema de archivos
- `@vqp/data-encrypted` - Datos encriptados
- `@vqp/data-database` - Base de datos SQL/NoSQL

### Crypto Adapters
- `@vqp/crypto-software` - Criptografía por software (Ed25519, secp256k1)
- `@vqp/crypto-hsm` - Hardware Security Modules
- `@vqp/crypto-browser` - WebCrypto API para navegadores

### Audit Adapters
- `@vqp/audit-console` - Logging a consola
- `@vqp/audit-file` - Logging a archivos
- `@vqp/audit-database` - Logging a base de datos

### Vocabulary Resolvers (Opcionales)
- `@vqp/vocab-http` - Resolución via HTTP
- `@vqp/vocab-s3` - Schemas en AWS S3
- `@vqp/vocab-local` - Schemas locales

### Query Evaluation  
- `@vqp/evaluation-jsonlogic` - JSONLogic evaluation engine

## 🔄 Guía de Migración

### Antes (Monolítico)

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

**Problemas:**
- Bundle incluye TODOS los adapters (filesystem, database, HSM, etc.)
- Vocabularios manejados internamente
- Configuración rígida

### Después (Modular)

```typescript
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// Solo incluye lo que necesitas
const dataAdapter = createFileSystemDataAdapter({ vaultPath: './vault.json' });
const cryptoAdapter = createSoftwareCryptoAdapter();
const auditAdapter = createConsoleAuditAdapter();
const queryAdapter = createJSONLogicAdapter();

const vqpService = new VQPService(
  dataAdapter,
  cryptoAdapter,
  auditAdapter,
  queryAdapter
);

// Vocabularios manejados a nivel de aplicación
const vocabularies = {
  'vqp:identity:v1': identitySchema,
  'vqp:financial:v1': financialSchema
};

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
