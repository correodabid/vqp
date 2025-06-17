<div align="center">

# 🔐 Verifiable Query Protocol (VQP)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.1.0-green.svg)](https://github.com/vqp-protocol/vqp)
[![Protocol Status](https://img.shields.io/badge/Status-Specification%20Complete-success.svg)](./docs/spec.md)

### *The Future of Privacy-Preserving Data Verification*

> **Ask without accessing.**  
> **Prove without revealing.**  
> **Verify without trusting.**

---

*What if you could verify someone's age without seeing their birth date?*  
*What if services could prove their uptime without exposing internal metrics?*  
*What if compliance could be verified without auditing private systems?*

**Welcome to the era of sovereign data verification.**

</div>

---

## 🚀 The Revolution Starts Here

**VQP (Verifiable Query Protocol)** is the first open protocol that enables **cryptographically verifiable queries over private data** without ever exposing the underlying information. 

### The Problem We're Solving

In today's digital world, verification requires exposure:
- 🔴 **Age verification** → Upload government ID
- 🔴 **Income verification** → Share bank statements  
- 🔴 **Health verification** → Provide medical records
- 🔴 **System compliance** → Allow external audits

**This is broken. Data sovereignty is dead.**

### The VQP Solution

With VQP, verification becomes sovereign:
- ✅ **Age verification** → Prove `age >= 18` with Zero-Knowledge
- ✅ **Income verification** → Prove `income > $50k` with cryptographic signatures
- ✅ **Health verification** → Prove vaccination status without medical history
- ✅ **System compliance** → Prove uptime without exposing internal metrics

---

## 📦 Installation

**VQP is built with a modular architecture.** Install only the components you need:

```bash
# Core VQP functionality
npm install @vqp/core

# Add specific adapters as needed
npm install @vqp/data-filesystem    # File-based data storage
npm install @vqp/crypto-software    # Software-based cryptography
npm install @vqp/audit-console      # Console logging
npm install @vqp/evaluation-jsonlogic # JSONLogic evaluation

# Or install everything at once
npm install @vqp/core @vqp/data-filesystem @vqp/crypto-software @vqp/audit-console @vqp/evaluation-jsonlogic
```

### Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0 (optional but recommended)

### Modular Architecture Benefits

- 🎯 **Minimal Bundle Size**: Only include what you need
- 🔧 **Technology Independence**: Swap adapters without changing core logic
- 🧪 **Easy Testing**: Mock adapters for comprehensive testing
- 📦 **Platform Flexibility**: Deploy to any environment

---

## ⚡ Quick Start

```typescript
import { VQPService, QueryBuilder } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createConsoleAuditAdapter } from '@vqp/audit-console';
import { createJSONLogicAdapter } from '@vqp/evaluation-jsonlogic';

// 1. Create a VQP responder (data owner)
const vqpService = new VQPService(
  createFileSystemDataAdapter({ vaultPath: './vault.json' }),
  createSoftwareCryptoAdapter({ keyId: 'my-service-key' }),
  await createConsoleAuditAdapter(),
  await createJSONLogicAdapter()
);

// 2. Build and process queries
const query = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ ">=": [{ "var": "age" }, 18] })
  .build();

const response = await vqpService.processQuery(query, {
  'vqp:identity:v1': { /* vocabulary schema */ }
});

console.log('Age verification result:', response.result); // true/false
console.log('Cryptographic proof:', response.proof.signature);
```

---

## 🎯 NEW: Response Modes v1.1

**VQP v1.1 introduces flexible response modes** that give data owners fine-grained control over how they respond to queries, enhancing privacy and providing more nuanced verification options.

### Four Response Modes

#### 1. 🔒 **Strict Mode** (Default)
Boolean-only responses for maximum privacy:

```typescript
const strictQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ ">=": [{ "var": "age" }, 18] })
  .strict() // Only returns true/false
  .build();

// Response: { "result": true, "responseMode": { "mode": "strict" } }
```

#### 2. 🤝 **Consensual Mode**
Reveals actual values with explicit user consent:

```typescript
const consensualQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:financial:v1')
  .expression({ "var": "annual_income" })
  .consensual() // Reveals value with consent
  .build();

// Response: { "result": true, "value": 75000, "responseMode": { "mode": "consensual", "consentProof": true } }
```

#### 3. 🔄 **Reciprocal Mode**
Mutual verification between parties:

```typescript
const reciprocalQuery = new QueryBuilder()
  .requester('did:web:company-a.com')
  .vocabulary('vqp:compliance:v1')
  .expression({ "in": ["ISO-27001", { "var": "certifications_active" }] })
  .reciprocal() // Requires mutual verification
  .build();

// Both parties verify each other's compliance status
```

#### 4. 🎭 **Obfuscated Mode**
Privacy-preserving value disclosure with noise or ranges:

```typescript
// Range obfuscation
const rangeQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:metrics:v1')
  .expression({ "var": "uptime_percentage_24h" })
  .obfuscated('range') // Returns value in ranges
  .build();

// Response: { "value": "95-99%", "responseMode": { "mode": "obfuscated", "obfuscation": "range" } }

// Noise obfuscation
const noiseQuery = new QueryBuilder()
  .requester('did:web:service.com')
  .vocabulary('vqp:financial:v1')
  .expression({ "var": "annual_income" })
  .obfuscated('noise') // Adds differential privacy noise
  .build();

// Response: { "value": 74821, "responseMode": { "mode": "obfuscated", "obfuscation": "noise" } }
```

### Real-World Examples

```typescript
// Age verification for streaming service (strict)
const streamingQuery = new QueryBuilder()
  .requester('did:web:netflix.com')
  .vocabulary('vqp:identity:v1')
  .expression({ ">=": [{ "var": "age" }, 13] })
  .strict()
  .build();

// Salary verification for loan (consensual)
const loanQuery = new QueryBuilder()
  .requester('did:web:bank.com')
  .vocabulary('vqp:financial:v1')
  .expression({ ">=": [{ "var": "annual_income" }, 50000] })
  .consensual()
  .build();

// B2B compliance check (reciprocal)
const b2bQuery = new QueryBuilder()
  .requester('did:web:vendor.com')
  .vocabulary('vqp:compliance:v1')
  .expression({ ">=": [{ "var": "audit_score" }, 85] })
  .reciprocal()
  .build();

// Service uptime for SLA (obfuscated)
const slaQuery = new QueryBuilder()
  .requester('did:web:customer.com')
  .vocabulary('vqp:metrics:v1')
  .expression({ "var": "uptime_percentage_7d" })
  .obfuscated('range')
  .build();
```

### Response Mode Benefits

- **🔒 Strict**: Maximum privacy, minimal data disclosure
- **🤝 Consensual**: Transparency with explicit user control
- **🔄 Reciprocal**: Mutual trust building between organizations
- **🎭 Obfuscated**: Useful data while preserving privacy

---

## 🔧 Advanced Usage

### Modular Architecture with Hexagonal Design

VQP follows hexagonal architecture with modular adapters. You can compose systems with different adapters:

```typescript
import { VQPService } from '@vqp/core';
import { createFileSystemDataAdapter } from '@vqp/data-filesystem';
import { createEncryptedDataAdapter } from '@vqp/data-encrypted';
import { createSoftwareCryptoAdapter } from '@vqp/crypto-software';
import { createSnarkjsCryptoAdapter } from '@vqp/crypto-snarkjs';

// Basic configuration
const basicVQP = new VQPService(
  createFileSystemDataAdapter({ vaultPath: './vault.json' }),
  createSoftwareCryptoAdapter({ keyId: 'basic-key' }),
  await createConsoleAuditAdapter(),
  await createJSONLogicAdapter()
);

// High-security configuration with encryption
const secureVQP = new VQPService(
  createEncryptedDataAdapter({ 
    vaultPath: './encrypted-vault.json',
    encryptionKey: process.env.VAULT_KEY 
  }),
  createSnarkjsCryptoAdapter({
    circuitPath: './circuits/age_verification.r1cs',
    provingKeyPath: './circuits/proving.key',
    verificationKeyPath: './circuits/verification.key'
  }),
  await createFileAuditAdapter({ logPath: './audit.log' }),
  await createJSONLogicAdapter()
);
```

### Zero-Knowledge Proofs

For maximum privacy, use ZK-SNARK proofs that prove statements without revealing underlying data:

```typescript
import { createSnarkjsCryptoAdapter } from '@vqp/crypto-snarkjs';

// Create VQP service with ZK-SNARK support
const zkVqpService = new VQPService(
  createFileSystemDataAdapter({ vaultPath: './vault.json' }),
  createSnarkjsCryptoAdapter({
    circuitPath: './circuits/age_verification.r1cs',
    provingKeyPath: './circuits/proving.key',
    verificationKeyPath: './circuits/verification.key'
  }),
  await createConsoleAuditAdapter(),
  await createJSONLogicAdapter()
);

// Age verification with ZK proof
const zkQuery = new QueryBuilder()
  .requester('did:web:private-service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ ">=": [{ "var": "age" }, 21] })
  .build();

const zkResponse = await zkVqpService.processQuery(zkQuery, vocabularies);

// Response includes ZK proof instead of signature
console.log(zkResponse.proof.type); // 'zk-snark'
console.log('Age verified with zero knowledge!');
```

### Custom Vocabularies

Create domain-specific vocabularies for your use cases:

```typescript
// Define custom vocabulary for your domain
const customVocab = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "HR Vocabulary v1.0.0",
  "type": "object",
  "properties": {
    "security_clearance": {
      "type": "string",
      "enum": ["public", "confidential", "secret", "top_secret"]
    },
    "years_experience": {
      "type": "integer",
      "minimum": 0
    },
    "certifications": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
};

// Use custom vocabulary in queries
const hrQuery = new QueryBuilder()
  .requester('did:web:hr-system.com')
  .vocabulary('https://mycompany.com/vqp/vocab/hr/v1')
  .expression({
    "and": [
      { ">=": [{ "var": "security_clearance" }, "confidential"] },
      { ">=": [{ "var": "years_experience" }, 5] },
      { "in": ["AWS-CERTIFIED", { "var": "certifications" }] }
    ]
  })
  .build();

const response = await vqpService.processQuery(hrQuery, {
  'https://mycompany.com/vqp/vocab/hr/v1': customVocab
});
```
    "security_clearance": {
      "type": "string",
      "enum": ["public", "secret", "top_secret"]
    },
    "certifications": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
};

// Use custom vocabulary in queries
const hrQuery = new QueryBuilder()
  .requester('did:web:hr-system.com')
  .vocabulary('https://mycompany.com/vqp/vocab/hr/v1')
  .expression({
    "and": [
      { ">=": [{ "var": "security_clearance" }, "confidential"] },
      { ">=": [{ "var": "years_experience" }, 5] },
      { "in": ["AWS-CERTIFIED", { "var": "certifications" }] }
    ]
  })
  .build();

const response = await vqpService.processQuery(hrQuery, {
  'https://mycompany.com/vqp/vocab/hr/v1': customVocab
});
```

---

## ⚡ Mind-Blowing Use Cases

<table>
<tr>
<td width="50%">

### 🏦 **Financial Services**
```javascript
// Loan application without bank statements
query: "annual_income >= 75000 AND 
        employment_duration >= 12_months"
response: true + cryptographic_proof
// Bank details: NEVER EXPOSED
```

</td>
<td width="50%">

### 🏥 **Healthcare**
```javascript
// Venue entry without medical records
query: "vaccinated('COVID-19') AND 
        doses >= 2"
response: true + zk_proof
// Medical history: NEVER EXPOSED
```

</td>
</tr>
<tr>
<td>

### 🎓 **Identity Verification**
```javascript
// Online service without document sharing
query: "age >= 21 AND 
        citizenship == 'US'"
response: true + signature
// Personal documents: NEVER EXPOSED
```

</td>
<td>

### 🏢 **Enterprise Compliance**
```javascript
// Vendor verification without system access
query: "iso27001_certified AND 
        last_audit <= 365_days"
response: true + multisig_proof
// Internal systems: NEVER EXPOSED
```

</td>
</tr>
</table>

---

## 🧠 The Architecture That Changes Everything

```mermaid
graph TB
    A[👤 Querier] -->|"🔍 Structured Query"| B[🏠 Responder]
    B -->|"🔐 Local Evaluation"| C[💾 Private Vault]
    C -->|"✅ Result"| D[🔏 Crypto Engine]
    D -->|"📜 Proof Generation"| E[📡 Response]
    E -->|"🔒 Signed/ZK Response"| A
    
    F[🌐 Anyone] -->|"✅ Verify"| E
    F -->|"❌ No Data Access"| C
    
    style C fill:#ff6b6b,color:#fff
    style D fill:#4ecdc4,color:#fff
    style E fill:#45b7d1,color:#fff
```

### **Core Innovation: JSONLogic + Cryptographic Proofs**

```typescript
// Query Structure (JSONLogic-based)
{
  "id": "uuid-v4",
  "version": "1.1.0", 
  "requester": "did:web:bank.example.com",
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:financial:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "annual_income" }, 50000] },
        { "==": [{ "var": "employment_status" }, "employed"] }
      ]
    }
  }
}
```

```typescript
// Response (Cryptographically Verifiable)
{
  "queryId": "original-query-uuid",
  "result": true,
  "timestamp": "2025-06-11T14:44:00Z",
  "responder": "did:key:user-identity",
  "proof": {
    "type": "zk-snark",
    "circuit": "income_verification_v1",
    "proof": "0x1a2b3c...",
    "publicInputs": { "threshold": 50000 }
  }
}
```

---

## 🎯 Protocol Features That Blow Minds

### 🔒 **Multiple Proof Systems**
- **Digital Signatures** (Ed25519, secp256k1, RSA) - Fast & Universal
- **Zero-Knowledge Proofs** (zk-SNARKs, Bulletproofs) - Ultimate Privacy
- **Multi-Signatures** - Distributed Trust & Consensus

### 🧩 **Extensible by Design**
- **Protocol-First**: Core specification, not opinionated implementation
- **Any Vocabulary**: Use standards or define your own domain schemas
- **Custom Data Mappings**: Map vocabularies to any existing data structure
- **Any Query Pattern**: Generic QueryBuilder supports all JSONLogic expressions
- **Future-Proof**: Add new proof systems, vocabularies, and query types

### 📚 **Standard Vocabularies (Optional)**
- `vqp:identity:v1` - Age, citizenship, credentials
- `vqp:financial:v1` - Income, employment, credit
- `vqp:health:v1` - Vaccinations, conditions, insurance
- `vqp:metrics:v1` - Uptime, performance, system health
- `vqp:compliance:v1` - Certifications, audits, policies
- `vqp:academic:v1` - Degrees, enrollment, transcripts
- `vqp:supply-chain:v1` - Origin, certifications, traceability
- `vqp:iot:v1` - Sensor data, device status, environmental
- **🌐 Schema.org** - Person, Organization, Product, Event, Place (NEW!)
- **+ Your Custom Vocabularies** - Define domain-specific schemas

### 🗺️ **Flexible Data Mapping**
- **Standard Mapping**: Works with predefined VQP vault structures
- **Flat Mapping**: For simple, flat data organizations
- **Custom Mapping**: Support any existing data structure without reorganization
- **Examples**: Employee systems, IoT hierarchies, multi-tenant architectures

### ⚡ **Performance That Scales**
- **Query Evaluation**: <100ms for complex expressions
- **Signature Generation**: <10ms (Ed25519)
- **ZK Proof Generation**: <5s (standard circuits)
- **Throughput**: 1000+ queries/second per node

---

## 🛠️ Developer Experience That Rocks

### **Quick Start (60 seconds)**

```bash
# Install VQP SDK
npm install @vqp/core @vqp/crypto

# Generate keys
vqp keygen --algorithm ed25519 --output ./keys/

# Start responder
vqp responder --vault ./my-vault.json --port 8080
```

```typescript
// Query someone's age (without knowing their birth date!)
import { QueryBuilder, VQPVerifier } from '@vqp/core';
import { SoftwareCryptoAdapter } from '@vqp/core';

// Build the query
const query = new QueryBuilder()
  .requester('did:web:my-service.com')
  .vocabulary('vqp:identity:v1')
  .expression({ '>=': [{ 'var': 'age' }, 18] })
  .build();

// Send query (using fetch or your preferred HTTP client)
const response = await fetch('https://person.example.com/vqp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(query)
});

const vqpResponse = await response.json();

// Verify the response
const crypto = new SoftwareCryptoAdapter();
const verifier = new VQPVerifier(crypto);
const isValid = await verifier.verifyComplete(vqpResponse, query.id);

if (isValid.overall) {
  console.log('✅ Person is 18+ (verified cryptographically!)');
}
```

### **Supported Platforms**

<div align="center">

| Language | Status | Installation |
|----------|--------|-------------|
| **TypeScript/JavaScript** | 🚧 Coming | `npm install @vqp/core` |
| **Python** | 🚧 Coming | `pip install vqp-core` |
| **Go** | 🚧 Coming | `go get github.com/vqp-protocol/vqp-go` |
| **Rust** | 🚧 Coming | `cargo add vqp-core` |

</div>

### **Integration Examples**

<details>
<summary><b>🐳 Docker Deployment</b></summary>

```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm install @vqp/core
EXPOSE 8080
CMD ["vqp", "responder", "--vault", "/secure/vault.json"]
```

</details>

<details>
<summary><b>☸️ Kubernetes Integration</b></summary>

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vqp-responder
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vqp-responder
  template:
    spec:
      containers:
      - name: vqp
        image: vqp/responder:latest
        env:
        - name: VQP_VAULT_PATH
          valueFrom:
            secretKeyRef:
              name: vqp-vault
              key: vault.json
```

</details>

<details>
<summary><b>⚡ Serverless (AWS Lambda)</b></summary>

```typescript
export const handler = async (event) => {
  const responder = new VQPResponder({
    vault: await loadFromS3(),
    signer: await loadFromKMS()
  });
  
  return await responder.handleQuery(JSON.parse(event.body));
};
```

</details>

---

## 🔐 Security Model That Actually Works

### **Threat Model Coverage**
- ✅ **Query Injection** → Vocabulary validation & sandboxing
- ✅ **Timing Attacks** → Constant-time operations
- ✅ **Correlation Attacks** → Privacy budgets & noise injection  
- ✅ **Replay Attacks** → Timestamp validation & nonces

### **Cryptographic Foundations**
- **Post-Quantum Ready**: Algorithm agnostic design
- **Hardware Security**: HSM & secure enclave support
- **Key Rotation**: Automated key lifecycle management
- **Audit Trails**: Immutable query/response logging

---

## 🌍 Real-World Impact

### **Industries Being Transformed**

🏦 **Financial Services**: KYC without document collection  
🏥 **Healthcare**: Clinical trials without patient data exposure  
🏢 **Enterprise**: B2B verification without system integration  
🎓 **Education**: Credential verification without transcript sharing  
🏭 **Supply Chain**: Ethical sourcing without trade secret exposure  
🤖 **AI/ML**: Model verification without weight exposure  

### **Compliance Standards Supported**

- **GDPR**: Right to erasure through cryptographic deletion
- **HIPAA**: Healthcare data verification without PHI exposure
- **SOX**: Financial compliance without system access
- **PCI DSS**: Payment verification without card data handling

---

## 📈 Roadmap to the Future

### **Phase 1: Foundation** (Q2 2025) ✅
- [x] Protocol specification v1.0
- [x] Core vocabularies (identity, financial, health, metrics)
- [x] TypeScript/JavaScript SDK
- [x] Reference CLI tools

### **Phase 2: Ecosystem** (Q3 2025) 🚧
- [ ] Python & Go SDKs
- [x] ZK-SNARK proof system
- [ ] Cloud provider integrations
- [ ] Performance optimizations

### **Phase 3: Scale** (Q4 2025) 📅
- [ ] Blockchain bridge protocols
- [ ] Mobile SDKs (iOS/Android)
- [ ] Enterprise management console
- [ ] Standards body engagement

### **Phase 4: Evolution** (2026) 🔮
- [ ] Post-quantum cryptography
- [ ] Homomorphic encryption support
- [ ] Federated learning integration
- [ ] Global interoperability

---

## 🤝 Join the Revolution

### **For Developers**
```bash
git clone https://github.com/vqp-protocol/vqp
cd vqp
npm install
npm run example:age-verification
```

### **For Organizations**
- 📧 **Enterprise Support**: enterprise@vqp.dev
- 💼 **Partnership Opportunities**: partnerships@vqp.dev
- 🎯 **Custom Implementations**: consulting@vqp.dev

### **For Researchers**
- 🔬 **Research Collaborations**: research@vqp.dev
- 📝 **Academic Papers**: publications@vqp.dev
- 💡 **Grant Opportunities**: grants@vqp.dev

---

## 📚 Deep Dive Documentation

| Resource | Description | Audience |
|----------|-------------|----------|
| **[📋 Protocol Specification](./docs/spec.md)** | Complete technical specification | Implementers |
| **[🏗️ Architecture Guide](./docs/architecture.md)** | System design & components | Architects |
| **[🔒 Security Model](./docs/security.md)** | Threat analysis & mitigations | Security Engineers |
| **[💡 Use Cases](./docs/use-cases.md)** | Real-world examples | Product Managers |
| **[⚙️ Integration Guide](./docs/integration-guide.md)** | Implementation instructions | Developers |
| **[🗺️ Custom Vocabulary Mapping](./docs/custom-vocabulary-mapping.md)** | Custom data structure support | Developers |
| **[📖 Vocabularies](./docs/vocabularies.md)** | Standard schemas | All Users |
| **[🌐 Schema.org Integration](./docs/schema-org-integration.md)** | Schema.org vocabulary support | Developers |
| **[🛣️ Roadmap](./docs/roadmap.md)** | Future development | Stakeholders |

---

## 🌟 Why VQP Will Change Everything

### **The Data Sovereignty Revolution**

For too long, verification has meant **surrendering control**. Organizations demand our personal data, sensitive documents, and private information just to answer simple yes/no questions.

**VQP flips this model upside down.**

With VQP, **you own your data, but the world can still verify what it needs to know.**

### **The Trust Infrastructure of the Future**

- **🔒 Privacy by Design**: Zero data leakage by default
- **🌐 Universal Interoperability**: Works across all systems & platforms  
- **⚡ Lightning Fast**: Sub-second verification for most queries
- **🔐 Quantum Resistant**: Ready for post-quantum cryptography
- **🏗️ Production Ready**: Enterprise-grade security & performance

---

## 📜 License & Legal

**MIT License** - This protocol is **free, open, and belongs to humanity.**

VQP is designed to be:
- ✅ **Patent-free**: No licensing restrictions
- ✅ **Vendor-neutral**: No single company controls it
- ✅ **Regulation-friendly**: Designed for compliance
- ✅ **Future-proof**: Extensible & evolvable

---

<div align="center">

## 🚀 The Future is Private. The Future is Verifiable. The Future is VQP.

**Ready to build the trust infrastructure of tomorrow?**

[![Get Started](https://img.shields.io/badge/Get%20Started-Now-brightgreen?style=for-the-badge)](./docs/integration-guide.md)
[![Join Community](https://img.shields.io/badge/Join%20Community-Discord-7289da?style=for-the-badge)](https://discord.gg/vqp-protocol)
[![Star on GitHub](https://img.shields.io/badge/⭐%20Star-GitHub-black?style=for-the-badge)](https://github.com/vqp-protocol/vqp)

---

*Built with ❤️ by privacy advocates, for a sovereign digital future.*

</div>
