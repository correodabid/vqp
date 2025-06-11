# VQP Use Cases & Examples

This document provides detailed use cases and practical examples of how the Verifiable Query Protocol (VQP) can be applied across different domains and scenarios.

## Personal Identity Verification

### Age Verification
**Scenario**: Online service needs to verify user is over 18 without collecting birth date.

**Traditional Approach**: 
- User uploads government ID
- Service stores personal information
- Privacy risk and compliance burden

**VQP Approach**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:identity:v1",
    "expr": { ">=": [{ "var": "age" }, 18] }
  }
}
```

**Response**:
```json
{
  "result": true,
  "proof": {
    "type": "zk-snark",
    "circuit": "age_verification_v1",
    "proof": "...",
    "publicInputs": { "threshold": 18 }
  }
}
```

**Benefits**:
- No personal data exposed
- Cryptographic proof of validity
- User maintains control
- Service gets required verification

### Professional Credentials
**Scenario**: Freelancer wants to prove they have specific certifications without revealing full resume.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0", 
    "vocab": "vqp:credentials:v1",
    "expr": {
      "and": [
        { "in": ["AWS Solutions Architect", { "var": "certifications" }] },
        { ">=": [{ "var": "years_experience" }, 3] }
      ]
    }
  }
}
```

**Use Cases**:
- Job applications
- Contractor verification
- Professional networking
- Compliance auditing

## Financial Services

### Income Verification
**Scenario**: Loan application requires proof of income above threshold.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:financial:v1", 
    "expr": {
      "and": [
        { ">=": [{ "var": "annual_income" }, 50000] },
        { "==": [{ "var": "employment_status" }, "employed"] },
        { ">=": [{ "var": "employment_duration_months" }, 12] }
      ]
    }
  }
}
```

**Benefits**:
- No bank statements shared
- Real-time verification
- Reduced fraud risk
- Faster loan processing

### Tax Compliance
**Scenario**: Cross-border payment service needs to verify tax residency.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:tax:v1",
    "expr": {
      "and": [
        { "==": [{ "var": "tax_resident_country" }, "US"] },
        { ">=": [{ "var": "days_in_country_last_year" }, 183] }
      ]
    }
  }
}
```

## Healthcare

### Vaccination Status
**Scenario**: Event venue requires proof of vaccination without accessing medical records.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:health:v1",
    "expr": {
      "and": [
        { "in": ["COVID-19", { "var": "vaccinations.completed" }] },
        { ">=": [{ "var": "vaccinations.COVID-19.doses" }, 2] }
      ]
    }
  }
}
```

### Medical Research Eligibility
**Scenario**: Clinical trial needs participants with specific characteristics.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:health:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "age" }, 25] },
        { "<=": [{ "var": "age" }, 65] },
        { "==": [{ "var": "diabetes_type" }, "type2"] },
        { "!": [{ "var": "pregnant" }] }
      ]
    }
  }
}
```

## Enterprise & B2B

### Vendor Compliance
**Scenario**: Company needs to verify supplier meets security standards.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:compliance:v1",
    "expr": {
      "and": [
        { "in": ["ISO-27001", { "var": "certifications.active" }] },
        { ">=": [{ "var": "security_audit_score" }, 85] },
        { "<=": [{ "var": "days_since_last_audit" }, 365] }
      ]
    }
  }
}
```

### Supply Chain Verification
**Scenario**: Retailer wants to verify product origin and ethical sourcing.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:supply-chain:v1",
    "expr": {
      "and": [
        { "==": [{ "var": "origin_country" }, "country_code"] },
        { "==": [{ "var": "fair_trade_certified" }, true] },
        { "<=": [{ "var": "carbon_footprint_kg" }, 10] }
      ]
    }
  }
}
```

## Technical Systems

### Microservice Health Checks
**Scenario**: Service mesh needs to verify service health without exposing internal metrics.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:metrics:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "uptime_percentage_24h" }, 99.5] },
        { "<=": [{ "var": "response_time_p95_ms" }, 200] },
        { "<=": [{ "var": "error_rate_percentage" }, 0.1] }
      ]
    }
  }
}
```

### Container Security Compliance
**Scenario**: Kubernetes cluster verifies container images meet security policies.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:container:v1",
    "expr": {
      "and": [
        { "==": [{ "var": "base_image_scanned" }, true] },
        { "<=": [{ "var": "critical_vulnerabilities" }, 0] },
        { "==": [{ "var": "runs_as_root" }, false] },
        { "in": ["distroless", { "var": "image_type" }] }
      ]
    }
  }
}
```

### Database Compliance Auditing
**Scenario**: Compliance team verifies database security without accessing data.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:database:v1",
    "expr": {
      "and": [
        { "==": [{ "var": "encryption_at_rest" }, true] },
        { "==": [{ "var": "encryption_in_transit" }, true] },
        { "<=": [{ "var": "days_since_backup" }, 1] },
        { ">=": [{ "var": "access_log_retention_days" }, 90] }
      ]
    }
  }
}
```

## IoT & Edge Computing

### Smart Home Privacy
**Scenario**: Home automation hub responds to queries about home status without exposing personal routines.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:smart-home:v1",
    "expr": {
      "and": [
        { "==": [{ "var": "security_system_armed" }, true] },
        { "<=": [{ "var": "minutes_since_last_motion" }, 60] }
      ]
    }
  }
}
```

### Industrial IoT Monitoring
**Scenario**: Factory equipment reports operational status for maintenance scheduling.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:industrial:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "operating_temperature_c" }, 20] },
        { "<=": [{ "var": "operating_temperature_c" }, 80] },
        { "<=": [{ "var": "vibration_level" }, 5] },
        { ">=": [{ "var": "hours_since_maintenance" }, 100] }
      ]
    }
  }
}
```

## AI & Machine Learning

### Model Performance Verification
**Scenario**: AI service verifies model accuracy without exposing training data or model weights.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:ml-model:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "accuracy_percentage" }, 95] },
        { "<=": [{ "var": "bias_score" }, 0.1] },
        { ">=": [{ "var": "training_samples" }, 10000] }
      ]
    }
  }
}
```

### Data Quality Assurance
**Scenario**: Data pipeline verifies data quality metrics for downstream consumers.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:data-quality:v1",
    "expr": {
      "and": [
        { "<=": [{ "var": "null_percentage" }, 5] },
        { ">=": [{ "var": "schema_compliance_percentage" }, 98] },
        { "<=": [{ "var": "duplicate_percentage" }, 2] }
      ]
    }
  }
}
```

## Academic & Research

### Research Collaboration
**Scenario**: Researchers want to verify dataset characteristics without sharing sensitive research data.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:research:v1",
    "expr": {
      "and": [
        { ">=": [{ "var": "sample_size" }, 1000] },
        { "==": [{ "var": "ethics_approved" }, true] },
        { "<=": [{ "var": "data_collection_year" }, 2025] }
      ]
    }
  }
}
```

### Student Verification
**Scenario**: University verifies student enrollment status for third-party services.

**Query**:
```json
{
  "query": {
    "lang": "jsonlogic@1.0.0",
    "vocab": "vqp:academic:v1", 
    "expr": {
      "and": [
        { "==": [{ "var": "enrollment_status" }, "active"] },
        { ">=": [{ "var": "credit_hours_current" }, 12] },
        { "==": [{ "var": "degree_level" }, "undergraduate"] }
      ]
    }
  }
}
```

## Implementation Examples

### Simple Age Verification Service

```javascript
// Client-side query generation
const ageQuery = {
  id: crypto.randomUUID(),
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  requester: "did:web:streaming-service.com",
  query: {
    lang: "jsonlogic@1.0.0",
    vocab: "vqp:identity:v1",
    expr: { ">=": [{ "var": "age" }, 18] }
  }
};

// Send query
const response = await fetch('/vqp/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(ageQuery)
});

// Verify response
const result = await response.json();
const isValid = await verifyVQPResponse(result);
```

### Personal Vault Response Handler

```python
class PersonalVault:
    def __init__(self, vault_path, private_key):
        self.data = self.load_encrypted_data(vault_path)
        self.signer = Ed25519Signer(private_key)
    
    async def handle_query(self, query):
        # Parse and validate query
        parsed = self.parse_query(query)
        
        # Check user consent
        if not await self.request_consent(parsed):
            return {"error": "consent_denied"}
        
        # Evaluate query
        result = self.evaluate_jsonlogic(
            parsed.expr, 
            self.data
        )
        
        # Generate signed response
        return self.sign_response(query.id, result)
```

### Enterprise Integration

```go
// Microservice VQP handler
func (s *VQPService) HandleQuery(w http.ResponseWriter, r *http.Request) {
    var query VQPQuery
    if err := json.NewDecoder(r.Body).Decode(&query); err != nil {
        http.Error(w, "Invalid query", 400)
        return
    }
    
    // Validate query against allowed vocabularies
    if !s.isVocabularyAllowed(query.Query.Vocab) {
        http.Error(w, "Vocabulary not allowed", 403)
        return
    }
    
    // Evaluate query against service metrics
    result, err := s.evaluateQuery(query)
    if err != nil {
        http.Error(w, "Evaluation failed", 500)
        return
    }
    
    // Sign and return response
    response := s.signResponse(query.ID, result)
    json.NewEncoder(w).Encode(response)
}
```

## Vocabulary Examples

### Identity Vocabulary (vqp:identity:v1)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VQP Identity Vocabulary v1",
  "description": "Standard vocabulary for personal identity queries",
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150
    },
    "citizenship": {
      "type": "string",
      "pattern": "^[A-Z]{2}$"
    },
    "has_drivers_license": {
      "type": "boolean"
    },
    "certifications": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

### System Metrics Vocabulary (vqp:metrics:v1)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "VQP System Metrics Vocabulary v1",
  "type": "object",
  "properties": {
    "uptime_percentage_24h": {
      "type": "number",
      "minimum": 0,
      "maximum": 100
    },
    "response_time_p95_ms": {
      "type": "number",
      "minimum": 0
    },
    "error_rate_percentage": {
      "type": "number", 
      "minimum": 0,
      "maximum": 100
    },
    "processed_events_last_hour": {
      "type": "integer",
      "minimum": 0
    }
  }
}
```

These use cases demonstrate VQP's versatility across domains while maintaining privacy, verifiability, and user control. The protocol enables new models of data sharing that weren't possible with traditional approaches.
