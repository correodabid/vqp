# VQP Integration Guide

This guide provides practical instructions for integrating the Verifiable Query Protocol (VQP) into your applications, services, and systems.

## Quick Start

### 1. Choose Your Role

**As a Responder** (Data Owner):
- You have data that others might want to query
- You want to maintain privacy while providing verifiable answers
- Examples: Personal wallet, microservice, IoT device

**As a Querier** (Information Seeker):
- You need specific information without accessing raw data
- You want cryptographic proof of the answers
- Examples: Web service, compliance system, research platform

**As a Verifier** (Trust Validator):
- You want to validate responses from other parties
- You need to check cryptographic proofs
- Examples: Audit system, third-party validator

### 2. Installation

#### Node.js / JavaScript
```bash
npm install @vqp/core @vqp/crypto
```

#### Python
```bash
pip install vqp-core vqp-crypto
```

#### Go
```bash
go get github.com/vqp-protocol/vqp-go
```

#### Rust
```bash
cargo add vqp-core vqp-crypto
```

## Implementing a Responder

### Basic Setup

#### JavaScript/Node.js
```javascript
import { VQPResponder, Ed25519Signer } from '@vqp/core';
import fs from 'fs';

// Initialize responder
const privateKey = fs.readFileSync('./keys/private.key');
const signer = new Ed25519Signer(privateKey);
const vault = JSON.parse(fs.readFileSync('./vault.json'));

const responder = new VQPResponder({
  signer,
  vault,
  allowedVocabularies: [
    'vqp:identity:v1',
    'vqp:metrics:v1'
  ]
});

// Handle incoming queries
responder.on('query', async (query) => {
  // Optional: Request user consent
  const consent = await requestUserConsent(query);
  if (!consent) {
    return responder.deny(query.id, 'consent_denied');
  }
  
  // Evaluate and respond
  const result = await responder.evaluate(query);
  return responder.respond(query.id, result);
});
```

#### Python
```python
from vqp_core import VQPResponder, Ed25519Signer
import json

# Load configuration
with open('vault.json') as f:
    vault = json.load(f)

with open('keys/private.key', 'rb') as f:
    private_key = f.read()

# Initialize responder
signer = Ed25519Signer(private_key)
responder = VQPResponder(
    signer=signer,
    vault=vault,
    allowed_vocabularies=['vqp:identity:v1', 'vqp:metrics:v1']
)

@responder.on_query
async def handle_query(query):
    # Check consent
    if not await request_user_consent(query):
        return responder.deny(query.id, 'consent_denied')
    
    # Evaluate and respond
    result = await responder.evaluate(query)
    return responder.respond(query.id, result)
```

#### Go
```go
package main

import (
    "encoding/json"
    "io/ioutil"
    "github.com/vqp-protocol/vqp-go"
)

func main() {
    // Load configuration
    vaultData, _ := ioutil.ReadFile("vault.json")
    var vault map[string]interface{}
    json.Unmarshal(vaultData, &vault)
    
    privateKey, _ := ioutil.ReadFile("keys/private.key")
    
    // Initialize responder
    signer := vqp.NewEd25519Signer(privateKey)
    responder := vqp.NewResponder(&vqp.ResponderConfig{
        Signer: signer,
        Vault:  vault,
        AllowedVocabularies: []string{
            "vqp:identity:v1",
            "vqp:metrics:v1",
        },
    })
    
    // Handle queries
    responder.OnQuery(func(query *vqp.Query) *vqp.Response {
        // Check consent
        if !requestUserConsent(query) {
            return responder.Deny(query.ID, "consent_denied")
        }
        
        // Evaluate and respond
        result, err := responder.Evaluate(query)
        if err != nil {
            return responder.Error(query.ID, err.Error())
        }
        
        return responder.Respond(query.ID, result)
    })
}
```

### Vault Configuration

Create a `vault.json` file with your data:

```json
{
  "personal": {
    "age": 28,
    "citizenship": "US",
    "has_drivers_license": true,
    "certifications": ["AWS Solutions Architect", "CISSP"]
  },
  "financial": {
    "annual_income": 75000,
    "employment_status": "employed",
    "tax_resident_country": "US"
  },
  "system": {
    "uptime_percentage_24h": 99.8,
    "processed_events_last_hour": 1250,
    "error_rate_percentage": 0.05
  }
}
```

### HTTP Server Integration

#### Express.js
```javascript
import express from 'express';
import { VQPResponder } from '@vqp/core';

const app = express();
app.use(express.json());

const responder = new VQPResponder(config);

app.post('/vqp/query', async (req, res) => {
  try {
    const query = req.body;
    const response = await responder.handleQuery(query);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000);
```

#### FastAPI (Python)
```python
from fastapi import FastAPI, HTTPException
from vqp_core import VQPResponder
import json

app = FastAPI()
responder = VQPResponder(config)

@app.post("/vqp/query")
async def handle_vqp_query(query: dict):
    try:
        response = await responder.handle_query(query)
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### Go HTTP Server
```go
package main

import (
    "encoding/json"
    "net/http"
    "github.com/vqp-protocol/vqp-go"
)

func main() {
    responder := vqp.NewResponder(config)
    
    http.HandleFunc("/vqp/query", func(w http.ResponseWriter, r *http.Request) {
        var query vqp.Query
        if err := json.NewDecoder(r.Body).Decode(&query); err != nil {
            http.Error(w, "Invalid query", 400)
            return
        }
        
        response, err := responder.HandleQuery(&query)
        if err != nil {
            http.Error(w, err.Error(), 400)
            return
        }
        
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
    })
    
    http.ListenAndServe(":8080", nil)
}
```

## Implementing a Querier

### Basic Query Construction

#### JavaScript
```javascript
import { VQPQuerier, QueryBuilder } from '@vqp/core';

const querier = new VQPQuerier({
  identity: 'did:web:my-service.com'
});

// Build a query
const query = new QueryBuilder()
  .target('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
  .vocabulary('vqp:identity:v1')
  .expression({
    "and": [
      { ">=": [{ "var": "age" }, 18] },
      { "==": [{ "var": "citizenship" }, "US"] }
    ]
  })
  .build();

// Send query
const response = await querier.query('https://target.example.com/vqp', query);

// Verify response
if (await querier.verify(response)) {
  console.log('Verified result:', response.result);
}
```

#### Python
```python
from vqp_core import VQPQuerier, QueryBuilder

querier = VQPQuerier(identity='did:web:my-service.com')

# Build query
query = (QueryBuilder()
    .target('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK')
    .vocabulary('vqp:identity:v1') 
    .expression({
        "and": [
            {">=": [{"var": "age"}, 18]},
            {"==": [{"var": "citizenship"}, "US"]}
        ]
    })
    .build())

# Send query
response = await querier.query('https://target.example.com/vqp', query)

# Verify response
if await querier.verify(response):
    print(f'Verified result: {response.result}')
```

### Batch Queries

```javascript
const queries = [
  queryBuilder.age_check(18),
  queryBuilder.citizenship_check('US'),
  queryBuilder.credential_check('drivers_license')
];

const responses = await querier.batch_query(endpoint, queries);

// Process responses
for (const [query, response] of responses) {
  if (await querier.verify(response)) {
    console.log(`Query ${query.id}: ${response.result}`);
  }
}
```

## Advanced Integration Patterns

### Microservice Integration

#### Service Mesh Integration
```yaml
# Istio VirtualService for VQP routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: vqp-routing
spec:
  http:
  - match:
    - headers:
        content-type:
          exact: application/vqp+json
    route:
    - destination:
        host: vqp-service
        port:
          number: 8080
```

#### Docker Container
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# VQP configuration
ENV VQP_VAULT_PATH=/app/vault.json
ENV VQP_PRIVATE_KEY_PATH=/app/keys/private.key
ENV VQP_PORT=8080

EXPOSE 8080
CMD ["npm", "start"]
```

#### Kubernetes Deployment
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
    metadata:
      labels:
        app: vqp-responder
    spec:
      containers:
      - name: vqp-responder
        image: my-app:vqp-enabled
        ports:
        - containerPort: 8080
        env:
        - name: VQP_VAULT_PATH
          value: "/etc/vqp/vault.json"
        volumeMounts:
        - name: vqp-config
          mountPath: /etc/vqp
      volumes:
      - name: vqp-config
        secret:
          secretName: vqp-vault
```

### Database Integration

#### PostgreSQL Integration
```sql
-- Create VQP query log table
CREATE TABLE vqp_queries (
    id UUID PRIMARY KEY,
    querier_did TEXT NOT NULL,
    query_hash TEXT NOT NULL,
    result BOOLEAN,
    timestamp TIMESTAMP DEFAULT NOW(),
    response_hash TEXT
);

-- Index for audit queries
CREATE INDEX idx_vqp_queries_timestamp ON vqp_queries(timestamp);
CREATE INDEX idx_vqp_queries_querier ON vqp_queries(querier_did);
```

```javascript
// Database-backed vault
class DatabaseVault {
  async getData(path) {
    const result = await this.db.query(
      'SELECT encrypted_value FROM vault_data WHERE path = $1',
      [path]
    );
    return this.decrypt(result.rows[0]?.encrypted_value);
  }
  
  async logQuery(queryId, querierDid, result) {
    await this.db.query(
      'INSERT INTO vqp_queries (id, querier_did, result) VALUES ($1, $2, $3)',
      [queryId, querierDid, result]
    );
  }
}
```

### Cloud Integration

#### AWS Lambda
```javascript
// Lambda function for VQP queries
exports.handler = async (event) => {
  const responder = new VQPResponder({
    vault: await loadVaultFromS3(),
    signer: await loadSignerFromKMS()
  });
  
  try {
    const query = JSON.parse(event.body);
    const response = await responder.handleQuery(query);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vqp+json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

#### Google Cloud Functions
```python
import functions_framework
from vqp_core import VQPResponder

@functions_framework.http
def vqp_handler(request):
    responder = VQPResponder(
        vault=load_vault_from_storage(),
        signer=load_signer_from_secret_manager()
    )
    
    try:
        query = request.get_json()
        response = await responder.handle_query(query)
        return response
    except Exception as e:
        return {'error': str(e)}, 400
```

### IoT Integration

#### Raspberry Pi
```python
# IoT sensor VQP responder
import asyncio
from vqp_core import VQPResponder
import sensors

class IoTVQPResponder:
    def __init__(self):
        self.responder = VQPResponder(
            vault=self.build_sensor_vault(),
            signer=load_device_signer()
        )
    
    def build_sensor_vault(self):
        return {
            'temperature_c': sensors.get_temperature(),
            'humidity_percent': sensors.get_humidity(), 
            'last_motion_minutes': sensors.time_since_motion(),
            'device_uptime_hours': sensors.get_uptime()
        }
    
    async def start_server(self):
        # Start HTTP server for VQP queries
        app = web.Application()
        app.router.add_post('/vqp/query', self.handle_query)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', 8080)
        await site.start()
```

## Security Best Practices

### Key Management

```javascript
// Secure key generation
import { generateKeyPair } from '@vqp/crypto';

const { privateKey, publicKey } = await generateKeyPair('ed25519');

// Store securely
await storeInHSM(privateKey); // Hardware Security Module
await publishPublicKey(publicKey); // Public key infrastructure
```

### Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const vqpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 VQP requests per windowMs
  message: 'Too many VQP queries, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/vqp', vqpRateLimit);
```

### Input Validation

```javascript
import Joi from 'joi';

const querySchema = Joi.object({
  id: Joi.string().uuid().required(),
  version: Joi.string().valid('1.0.0').required(),
  timestamp: Joi.date().iso().required(),
  query: Joi.object({
    lang: Joi.string().valid('jsonlogic@1.0.0').required(),
    vocab: Joi.string().uri().required(),
    expr: Joi.object().required()
  }).required()
});

app.post('/vqp/query', (req, res) => {
  const { error } = querySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // Process valid query
});
```

## Testing

### Unit Tests

```javascript
// Jest test example
import { VQPResponder } from '@vqp/core';

describe('VQP Responder', () => {
  let responder;
  
  beforeEach(() => {
    responder = new VQPResponder({
      vault: { age: 25, citizenship: 'US' },
      signer: mockSigner
    });
  });
  
  test('should respond to age query correctly', async () => {
    const query = {
      id: 'test-query',
      query: {
        lang: 'jsonlogic@1.0.0',
        vocab: 'vqp:identity:v1',
        expr: { '>=': [{ 'var': 'age' }, 18] }
      }
    };
    
    const response = await responder.handleQuery(query);
    
    expect(response.result).toBe(true);
    expect(response.proof).toBeDefined();
  });
});
```

### Integration Tests

```python
import pytest
from vqp_core import VQPQuerier, VQPResponder

@pytest.mark.asyncio
async def test_full_vqp_flow():
    # Setup responder
    responder = VQPResponder(vault={'age': 25}, signer=test_signer)
    
    # Setup querier
    querier = VQPQuerier(identity='test-querier')
    
    # Build query
    query = QueryBuilder().age_check(18).build()
    
    # Simulate query/response
    response = await responder.handle_query(query)
    
    # Verify response
    is_valid = await querier.verify(response)
    
    assert is_valid
    assert response.result is True
```

## Monitoring & Observability

### Metrics Collection

```javascript
import prometheus from 'prom-client';

// VQP-specific metrics
const vqpQueryCounter = new prometheus.Counter({
  name: 'vqp_queries_total',
  help: 'Total number of VQP queries processed',
  labelNames: ['vocabulary', 'result', 'status']
});

const vqpResponseTime = new prometheus.Histogram({
  name: 'vqp_response_duration_seconds',
  help: 'VQP query response time',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Instrument VQP responder
responder.on('query_processed', (query, response, duration) => {
  vqpQueryCounter.inc({
    vocabulary: query.query.vocab,
    result: response.result.toString(),
    status: 'success'
  });
  
  vqpResponseTime.observe(duration);
});
```

### Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'vqp-audit.log' })
  ]
});

responder.on('query', (query) => {
  logger.info('VQP query received', {
    queryId: query.id,
    querier: query.requester,
    vocabulary: query.query.vocab,
    timestamp: query.timestamp
  });
});
```

This integration guide provides the foundation for implementing VQP in your systems. Start with the basic patterns and gradually adopt more advanced features as needed.
