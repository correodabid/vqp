# VQP Security Model

This document outlines the security architecture, threat model, and security considerations for the Verifiable Query Protocol (VQP).

## Table of Contents

1. [Security Objectives](#security-objectives)
2. [Threat Model](#threat-model)
3. [Cryptographic Foundations](#cryptographic-foundations)
4. [Privacy Guarantees](#privacy-guarantees)
5. [Attack Scenarios & Mitigations](#attack-scenarios--mitigations)
6. [Implementation Security](#implementation-security)
7. [Compliance Considerations](#compliance-considerations)

## Security Objectives

### Primary Objectives

1. **Data Sovereignty**: Data owners maintain complete control over their information
2. **Privacy Preservation**: No unnecessary data disclosure beyond query results
3. **Response Integrity**: Cryptographic guarantees that responses are authentic and unmodified
4. **Non-repudiation**: Responders cannot deny having provided a response
5. **Consent Enforcement**: No data processing without explicit consent

### Secondary Objectives

1. **Availability**: System remains operational under normal conditions
2. **Auditability**: All interactions can be logged and reviewed
3. **Interoperability**: Security works across different implementations
4. **Forward Compatibility**: Security model can evolve with new threats

## Threat Model

### Trust Assumptions

1. **Responders**: Trusted to evaluate queries honestly over their declared data
2. **Cryptographic Primitives**: Standard algorithms (Ed25519, SHA-256) are secure
3. **Key Management**: Private keys are properly protected by their owners
4. **Transport Security**: Communications use TLS or equivalent protection

### Threat Actors

#### Malicious Querier
**Capabilities**:
- Can craft arbitrary queries
- May attempt to extract more information than intended
- Can replay old queries
- May try to correlate responses across time

**Motivations**:
- Data harvesting
- Privacy invasion
- Competitive intelligence

#### Malicious Responder
**Capabilities**:
- Can provide false responses
- May selectively respond to certain queries
- Can manipulate local data before evaluation
- May attempt to track queriers

**Motivations**:
- Fraud or misrepresentation
- Avoiding compliance
- Competitive advantage

#### Network Adversary (Man-in-the-Middle)
**Capabilities**:
- Can intercept network communications
- May attempt to modify messages in transit
- Can perform replay attacks
- May try to identify communication patterns

**Motivations**:
- Data interception
- Service disruption
- Traffic analysis

#### Compromised Infrastructure
**Capabilities**:
- May have access to stored data
- Can potentially extract private keys
- May monitor system behavior
- Can inject malicious code

**Motivations**:
- Data theft
- System compromise
- Long-term surveillance

### Attack Categories

#### Information Disclosure Attacks
- Side-channel attacks on query evaluation
- Timing analysis to infer data characteristics
- Query correlation to build profiles
- Vocabulary inference attacks

#### Integrity Attacks
- Response tampering
- False signature generation
- Replay attacks with old responses
- Signature substitution

#### Availability Attacks
- Denial of service through query flooding
- Resource exhaustion attacks
- Key compromise leading to service unavailability

#### Privacy Attacks
- Fingerprinting through response patterns
- Inference attacks using multiple queries
- Correlation attacks across sessions
- Deanonymization through vocabulary choices

## Cryptographic Foundations

### Digital Signatures

#### Ed25519 (Recommended)
```
Public Key: 32 bytes
Private Key: 32 bytes
Signature: 64 bytes
Security Level: 128-bit equivalent
```

**Advantages**:
- High performance
- Small key/signature sizes
- Resistance to timing attacks
- Deterministic signatures

**Use Cases**:
- Standard VQP responses
- Resource-constrained environments
- High-volume applications

#### secp256k1 (Blockchain Compatibility)
```
Public Key: 33 bytes (compressed)
Private Key: 32 bytes
Signature: 64-71 bytes (DER encoding)
Security Level: 128-bit equivalent
```

**Advantages**:
- Ecosystem compatibility
- Hardware wallet support
- Existing tooling

**Use Cases**:
- Blockchain integration
- Cryptocurrency applications
- DeFi protocols

#### RSA-PSS (Enterprise Integration)
```
Key Size: 2048-4096 bits
Signature Size: Key size dependent
Security Level: 112-128 bit equivalent
```

**Advantages**:
- Enterprise standard
- PKI integration
- Hardware support

**Use Cases**:
- Legacy system integration
- Enterprise deployments
- Regulatory compliance

### Zero-Knowledge Proofs

#### zk-SNARKs
**Circuit Example (Age Verification)**:
```zokrates
def main(private field age, field threshold) -> field:
    field result = if age >= threshold then 1 else 0 fi
    return result
```

**Properties**:
- Constant proof size (~200 bytes)
- Fast verification (~5ms)
- Trusted setup required
- Complex circuit development

#### Bulletproofs
**Use Cases**:
- Range proofs (age > 18, income > $50k)
- Set membership proofs
- Arithmetic circuit proofs

**Properties**:
- No trusted setup
- Logarithmic proof size
- Slower verification than SNARKs
- More flexible than SNARKs

#### Sigma Protocols
**Use Cases**:
- Simple boolean proofs
- Proof of knowledge
- Commitment schemes

**Properties**:
- Simple construction
- Interactive or non-interactive (Fiat-Shamir)
- Efficient for basic proofs
- Limited expressiveness

### Hash Functions

#### SHA-256
- Query content hashing
- Merkle tree construction
- Commitment schemes

#### BLAKE3
- High-performance hashing
- Streaming data processing
- Parallel computation

### Encryption

#### ChaCha20-Poly1305
- Vault data encryption
- Message encryption for transport
- Authenticated encryption

#### AES-256-GCM
- Standards compliance
- Hardware acceleration
- High-throughput scenarios

## Privacy Guarantees

### Data Minimization

**Principle**: Only disclose the minimum information necessary to answer the query.

**Implementation**:
```json
{
  "query": "age >= 18",
  "response": true,
  "disclosed": "boolean result only"
}
```

**Not Disclosed**:
- Actual age value
- Other personal attributes
- Data source or format
- Query evaluation process

### Unlinkability

**Principle**: Multiple queries to the same responder cannot be linked without explicit correlation.

**Techniques**:
- Fresh key derivation per session
- Randomized response timing
- Noise injection for sensitive queries
- Anonymous communication channels

### Forward Privacy

**Principle**: Past interactions remain private even if long-term secrets are compromised.

**Implementation**:
- Ephemeral keys for sessions
- Perfect forward secrecy in transport
- Regular key rotation
- Secure deletion of temporary data

### Differential Privacy

**Principle**: Individual data points cannot be distinguished in aggregate queries.

**Application**:
```python
def private_count(data, threshold, epsilon=1.0):
    true_count = sum(1 for x in data if x >= threshold)
    noise = np.random.laplace(0, 1/epsilon)
    return max(0, true_count + noise)
```

## Attack Scenarios & Mitigations

### Query Injection Attacks

**Attack**: Malicious queries attempt to extract unintended information.

**Example**:
```json
{
  "expr": {
    "or": [
      { ">=": [{ "var": "age" }, 0] },
      { "var": "social_security_number" }
    ]
  }
}
```

**Mitigations**:
1. **Vocabulary Validation**: Only allow pre-approved variable names
2. **Expression Sandboxing**: Evaluate queries in isolated environments
3. **Query Complexity Limits**: Restrict depth and operations
4. **Semantic Analysis**: Detect information disclosure attempts

```javascript
// Vocabulary validation
function validateQuery(query) {
  const allowedVars = getVocabularyVariables(query.vocab);
  const usedVars = extractVariables(query.expr);
  
  for (const variable of usedVars) {
    if (!allowedVars.includes(variable)) {
      throw new SecurityError(`Variable '${variable}' not allowed`);
    }
  }
}
```

### Timing Attacks

**Attack**: Inferring information from response timing patterns.

**Scenario**:
```
Query: "income > $100k" → 50ms response (false)
Query: "income > $50k"  → 52ms response (true)
Query: "income > $75k"  → 51ms response (?)
```

**Mitigations**:
1. **Constant-time Operations**: All queries take similar time
2. **Response Delays**: Add randomized delays
3. **Batch Processing**: Process multiple queries together
4. **Pre-computation**: Cache common query results

```javascript
// Constant-time response
async function evaluateQuery(query) {
  const startTime = Date.now();
  const result = await doEvaluation(query);
  
  // Ensure minimum response time
  const minResponseTime = 100; // 100ms
  const elapsed = Date.now() - startTime;
  if (elapsed < minResponseTime) {
    await sleep(minResponseTime - elapsed);
  }
  
  return result;
}
```

### Correlation Attacks

**Attack**: Linking multiple queries to build detailed profiles.

**Scenario**:
```
Query 1: "age > 25" → true
Query 2: "income > $60k" → true  
Query 3: "location = 'San Francisco'" → true
Query 4: "has_children = true" → false
// Attacker builds demographic profile
```

**Mitigations**:
1. **Query Rate Limiting**: Limit queries per time period
2. **Correlation Detection**: Detect suspicious query patterns
3. **Privacy Budgets**: Limit total information disclosure
4. **Anonymous Querying**: Use anonymous communication channels

```javascript
// Privacy budget implementation
class PrivacyBudget {
  constructor(totalBudget = 1.0) {
    this.remaining = totalBudget;
    this.queries = [];
  }
  
  canAnswer(query, cost) {
    return this.remaining >= cost;
  }
  
  spendBudget(query, cost) {
    if (!this.canAnswer(query, cost)) {
      throw new PrivacyError('Privacy budget exhausted');
    }
    this.remaining -= cost;
    this.queries.push({ query, cost, timestamp: Date.now() });
  }
}
```

### Response Forgery

**Attack**: Providing false responses with valid signatures.

**Scenario**:
- Responder claims "income > $100k" = true (falsely)
- Signs the false response with valid key
- Querier cannot detect the lie

**Mitigations**:
1. **Multi-source Verification**: Query multiple responders
2. **Oracle Integration**: Use external verification sources
3. **Reputation Systems**: Track responder reliability
4. **Audit Trails**: Enable post-hoc verification

```javascript
// Multi-source verification
async function verifyWithConsensus(query, responders, threshold = 0.67) {
  const responses = await Promise.all(
    responders.map(r => queryResponder(r, query))
  );
  
  const validResponses = responses.filter(r => verifySignature(r));
  const consensus = calculateConsensus(validResponses);
  
  if (consensus.confidence >= threshold) {
    return consensus.result;
  } else {
    throw new ConsensusError('Insufficient consensus');
  }
}
```

### Key Compromise

**Attack**: Private keys are stolen or compromised.

**Impact**:
- Ability to forge responses
- Impersonation of legitimate responders
- Access to encrypted vault data

**Mitigations**:
1. **Key Rotation**: Regular key updates
2. **Hardware Security**: HSM or secure enclave storage
3. **Multi-factor Authentication**: Additional authentication layers
4. **Key Revocation**: Mechanism to invalidate compromised keys

```javascript
// Key rotation strategy
class KeyManager {
  async rotateKeys() {
    const newKeyPair = await generateKeyPair();
    
    // Gradual transition
    this.currentKey = newKeyPair;
    this.previousKey = this.oldKey; // Keep for verification
    
    // Publish new public key
    await publishKeyUpdate(newKeyPair.publicKey);
    
    // Schedule old key deletion
    setTimeout(() => {
      this.secureDelete(this.previousKey);
    }, KEY_TRANSITION_PERIOD);
  }
}
```

## Implementation Security

### Secure Coding Practices

#### Input Validation
```javascript
// Comprehensive query validation
function validateVQPQuery(query) {
  // Structure validation
  if (!query.id || !isValidUUID(query.id)) {
    throw new ValidationError('Invalid query ID');
  }
  
  // Timestamp validation
  const now = Date.now();
  const queryTime = new Date(query.timestamp).getTime();
  if (Math.abs(now - queryTime) > MAX_TIMESTAMP_SKEW) {
    throw new ValidationError('Query timestamp out of range');
  }
  
  // Expression validation
  validateExpression(query.query.expr, query.query.vocab);
}
```

#### Memory Safety
```rust
// Rust implementation with memory safety
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct VQPQuery {
    pub id: String,
    pub timestamp: String,
    pub query: QueryExpression,
}

// Automatic memory management prevents buffer overflows
impl VQPResponder {
    pub fn evaluate_query(&self, query: &VQPQuery) -> Result<bool, Error> {
        // Safe memory access guaranteed by Rust
        let vault_data = &self.vault;
        let result = self.evaluator.evaluate(&query.query.expr, vault_data)?;
        Ok(result)
    }
}
```

#### Secure Random Number Generation
```python
import secrets
import os

def generate_nonce():
    """Generate cryptographically secure random nonce"""
    return secrets.token_bytes(32)

def generate_key_pair():
    """Generate Ed25519 key pair with secure randomness"""
    random_seed = os.urandom(32)
    private_key = Ed25519PrivateKey.from_private_bytes(random_seed)
    public_key = private_key.public_key()
    return private_key, public_key
```

### Deployment Security

#### Container Security
```dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S vqp && \
    adduser -S vqp -u 1001

# Set security headers
RUN echo 'fs.suid_dumpable = 0' >> /etc/sysctl.conf

# Copy application
COPY --chown=vqp:vqp . /app
WORKDIR /app

USER vqp

# Security scanning
RUN npm audit fix

EXPOSE 8080
CMD ["npm", "start"]
```

#### Network Security
```yaml
# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: vqp-network-policy
spec:
  podSelector:
    matchLabels:
      app: vqp-responder
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: vqp-querier
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS only
```

### Key Management

#### Hardware Security Modules
```javascript
// HSM integration for key storage
const { CloudHSM } = require('@aws-sdk/client-cloudhsm');

class HSMKeyManager {
  constructor(hsmConfig) {
    this.hsm = new CloudHSM(hsmConfig);
  }
  
  async signResponse(response) {
    // Sign using HSM-protected key
    const signature = await this.hsm.sign({
      KeyId: this.signingKeyId,
      Message: Buffer.from(JSON.stringify(response)),
      SigningAlgorithm: 'ECDSA_SHA_256'
    });
    
    return signature.Signature;
  }
}
```

#### Key Derivation
```python
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import os

def derive_key(password: str, salt: bytes = None) -> bytes:
    """Derive encryption key from password using PBKDF2"""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,  # NIST recommended minimum
    )
    
    return kdf.derive(password.encode())
```

## Compliance Considerations

### GDPR Compliance

#### Right to Erasure
```javascript
class GDPRCompliantVault {
  async forgetData(dataCategory) {
    // Cryptographic erasure - delete encryption keys
    await this.keyManager.deleteKey(dataCategory);
    
    // Data becomes undecryptable
    this.auditLog.record('data_erased', {
      category: dataCategory,
      timestamp: Date.now(),
      method: 'cryptographic_erasure'
    });
  }
}
```

#### Data Processing Records
```json
{
  "processing_record": {
    "query_id": "550e8400-e29b-41d4-a716-446655440000",
    "data_subject": "anonymized_id_hash",
    "purpose": "age_verification",
    "legal_basis": "consent",
    "data_categories": ["age"],
    "timestamp": "2025-06-11T14:44:00Z",
    "retention_period": "30_days"
  }
}
```

### HIPAA Compliance

#### Access Controls
```python
class HIPAAAccessControl:
    def __init__(self):
        self.access_matrix = {
            'patient_data': ['doctor', 'nurse', 'patient'],
            'treatment_records': ['doctor', 'specialist'],
            'billing_info': ['billing_dept', 'insurance']
        }
    
    def authorize_query(self, query, requester_role):
        data_types = self.extract_data_types(query)
        
        for data_type in data_types:
            if requester_role not in self.access_matrix.get(data_type, []):
                raise UnauthorizedError(f'Role {requester_role} cannot access {data_type}')
```

### SOX Compliance

#### Audit Trails
```sql
-- Immutable audit log
CREATE TABLE vqp_audit_log (
    id SERIAL PRIMARY KEY,
    query_id UUID NOT NULL,
    requester_id TEXT NOT NULL,
    responder_id TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    response_hash TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    -- Immutability constraint
    created_at TIMESTAMP DEFAULT NOW() CHECK (created_at = NOW())
);

-- Prevent updates and deletes
REVOKE UPDATE, DELETE ON vqp_audit_log FROM ALL;
```

### Financial Regulations

#### PCI DSS Compliance
```javascript
// Payment card data protection
class PCICompliantVault {
  storeCardData(cardData) {
    // Tokenization instead of storage
    const token = this.tokenizationService.tokenize(cardData);
    
    // Store only token, never raw card data
    return {
      token: token,
      last_four: cardData.number.slice(-4),
      expiry_month: cardData.expiryMonth,
      expiry_year: cardData.expiryYear
    };
  }
  
  processPaymentQuery(query) {
    // Queries against tokens only
    if (this.detectCardDataInQuery(query)) {
      throw new ComplianceError('Raw card data not permitted in queries');
    }
    
    return this.evaluateTokenQuery(query);
  }
}
```

This security model provides comprehensive protection while maintaining the privacy and verifiability goals of VQP. Regular security reviews and updates ensure continued protection against evolving threats.
