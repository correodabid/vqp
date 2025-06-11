# VQP Standard Vocabularies

This document defines standard vocabularies for common query domains in the Verifiable Query Protocol (VQP). These vocabularies provide semantic consistency across implementations and enable interoperability between different systems.

## Table of Contents

1. [Vocabulary Structure](#vocabulary-structure)
2. [Identity Vocabulary](#identity-vocabulary)
3. [Financial Vocabulary](#financial-vocabulary)
4. [Health Vocabulary](#health-vocabulary)
5. [System Metrics Vocabulary](#system-metrics-vocabulary)
6. [Compliance Vocabulary](#compliance-vocabulary)
7. [Academic Vocabulary](#academic-vocabulary)
8. [Supply Chain Vocabulary](#supply-chain-vocabulary)
9. [IoT Vocabulary](#iot-vocabulary)
10. [Custom Vocabulary Guidelines](#custom-vocabulary-guidelines)

## Vocabulary Structure

### Schema Format

All VQP vocabularies use JSON Schema Draft 2020-12:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/domain/v1.0.0",
  "title": "VQP Domain Vocabulary v1.0.0",
  "description": "Description of the vocabulary domain",
  "type": "object",
  "properties": {
    "field_name": {
      "type": "data_type",
      "description": "Field description",
      "examples": ["example_value"]
    }
  },
  "required": ["required_fields"]
}
```

### Naming Conventions

- **Field Names**: snake_case (e.g., `birth_date`, `annual_income`)
- **Vocabulary IDs**: `vqp:domain:version` (e.g., `vqp:identity:v1`)
- **Enum Values**: lowercase with underscores (e.g., `employed`, `self_employed`)
- **Boolean Fields**: Use positive phrasing (e.g., `has_license` not `no_license`)

## Identity Vocabulary

**Vocabulary ID**: `vqp:identity:v1`
**URI**: `https://vqp.dev/vocab/identity/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/identity/v1.0.0",
  "title": "VQP Identity Vocabulary v1.0.0",
  "description": "Standard vocabulary for personal identity verification",
  "type": "object",
  "properties": {
    "age": {
      "type": "integer",
      "minimum": 0,
      "maximum": 150,
      "description": "Age in years",
      "examples": [25, 18, 65]
    },
    "birth_year": {
      "type": "integer",
      "minimum": 1900,
      "maximum": 2100,
      "description": "Year of birth",
      "examples": [1990, 2000, 1985]
    },
    "citizenship": {
      "type": "string",
      "pattern": "^[A-Z]{2}$",
      "description": "ISO 3166-1 alpha-2 country code",
      "examples": ["US", "GB", "DE", "JP"]
    },
    "residency_country": {
      "type": "string", 
      "pattern": "^[A-Z]{2}$",
      "description": "Current country of residence",
      "examples": ["US", "CA", "FR"]
    },
    "has_drivers_license": {
      "type": "boolean",
      "description": "Has valid driver's license",
      "examples": [true, false]
    },
    "has_passport": {
      "type": "boolean",
      "description": "Has valid passport",
      "examples": [true, false]
    },
    "government_id_verified": {
      "type": "boolean",
      "description": "Government-issued ID has been verified",
      "examples": [true, false]
    },
    "email_verified": {
      "type": "boolean",
      "description": "Email address has been verified",
      "examples": [true, false]
    },
    "phone_verified": {
      "type": "boolean",
      "description": "Phone number has been verified",
      "examples": [true, false]
    },
    "biometric_verified": {
      "type": "boolean",
      "description": "Biometric verification completed",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Age verification
{
  "expr": { ">=": [{ "var": "age" }, 18] }
}

// Citizenship check
{
  "expr": { "==": [{ "var": "citizenship" }, "US"] }
}

// Multiple requirements
{
  "expr": {
    "and": [
      { ">=": [{ "var": "age" }, 21] },
      { "==": [{ "var": "government_id_verified" }, true] }
    ]
  }
}
```

## Financial Vocabulary

**Vocabulary ID**: `vqp:financial:v1`
**URI**: `https://vqp.dev/vocab/financial/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/financial/v1.0.0",
  "title": "VQP Financial Vocabulary v1.0.0",
  "description": "Standard vocabulary for financial information",
  "type": "object",
  "properties": {
    "annual_income": {
      "type": "integer",
      "minimum": 0,
      "description": "Annual income in USD",
      "examples": [50000, 75000, 120000]
    },
    "monthly_income": {
      "type": "integer",
      "minimum": 0,
      "description": "Monthly income in USD",
      "examples": [4000, 6000, 10000]
    },
    "employment_status": {
      "type": "string",
      "enum": ["employed", "self_employed", "unemployed", "retired", "student"],
      "description": "Current employment status",
      "examples": ["employed", "self_employed"]
    },
    "employment_duration_months": {
      "type": "integer",
      "minimum": 0,
      "description": "Months in current employment",
      "examples": [6, 24, 60]
    },
    "credit_score": {
      "type": "integer",
      "minimum": 300,
      "maximum": 850,
      "description": "FICO credit score",
      "examples": [650, 720, 800]
    },
    "has_bank_account": {
      "type": "boolean",
      "description": "Has verified bank account",
      "examples": [true, false]
    },
    "debt_to_income_ratio": {
      "type": "number",
      "minimum": 0,
      "maximum": 10,
      "description": "Debt-to-income ratio",
      "examples": [0.2, 0.35, 0.8]
    },
    "tax_resident_country": {
      "type": "string",
      "pattern": "^[A-Z]{2}$",
      "description": "Tax residency country code",
      "examples": ["US", "GB", "DE"]
    },
    "assets_verified": {
      "type": "boolean",
      "description": "Assets have been verified",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Income verification
{
  "expr": { ">=": [{ "var": "annual_income" }, 50000] }
}

// Employment check
{
  "expr": {
    "and": [
      { "==": [{ "var": "employment_status" }, "employed"] },
      { ">=": [{ "var": "employment_duration_months" }, 12] }
    ]
  }
}

// Loan qualification
{
  "expr": {
    "and": [
      { ">=": [{ "var": "credit_score" }, 650] },
      { "<=": [{ "var": "debt_to_income_ratio" }, 0.4] },
      { ">=": [{ "var": "annual_income" }, 40000] }
    ]
  }
}
```

## Health Vocabulary

**Vocabulary ID**: `vqp:health:v1`
**URI**: `https://vqp.dev/vocab/health/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/health/v1.0.0",
  "title": "VQP Health Vocabulary v1.0.0",
  "description": "Standard vocabulary for health-related information",
  "type": "object",
  "properties": {
    "vaccinations_completed": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of completed vaccinations",
      "examples": [["COVID-19", "influenza", "hepatitis_b"]]
    },
    "covid_vaccination_doses": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of COVID-19 vaccination doses",
      "examples": [0, 2, 3, 4]
    },
    "last_vaccination_date": {
      "type": "string",
      "format": "date",
      "description": "Date of last vaccination (ISO 8601)",
      "examples": ["2024-01-15", "2023-09-20"]
    },
    "blood_type": {
      "type": "string",
      "enum": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      "description": "ABO blood type",
      "examples": ["O+", "A-", "AB+"]
    },
    "allergies": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Known allergies",
      "examples": [["penicillin", "peanuts"], ["none"]]
    },
    "chronic_conditions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Chronic medical conditions",
      "examples": [["diabetes_type2", "hypertension"], ["none"]]
    },
    "medical_device_implanted": {
      "type": "boolean",
      "description": "Has implanted medical device",
      "examples": [true, false]
    },
    "pregnant": {
      "type": "boolean",
      "description": "Currently pregnant",
      "examples": [true, false]
    },
    "recent_surgery_90_days": {
      "type": "boolean",
      "description": "Had surgery in last 90 days",
      "examples": [true, false]
    },
    "insurance_verified": {
      "type": "boolean",
      "description": "Health insurance verified",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Vaccination status
{
  "expr": {
    "and": [
      { "in": ["COVID-19", { "var": "vaccinations_completed" }] },
      { ">=": [{ "var": "covid_vaccination_doses" }, 2] }
    ]
  }
}

// Clinical trial eligibility
{
  "expr": {
    "and": [
      { "!": [{ "var": "pregnant" }] },
      { "!": [{ "in": ["diabetes_type1", { "var": "chronic_conditions" }] }] },
      { "!": [{ "var": "recent_surgery_90_days" }] }
    ]
  }
}
```

## System Metrics Vocabulary

**Vocabulary ID**: `vqp:metrics:v1`
**URI**: `https://vqp.dev/vocab/metrics/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/metrics/v1.0.0",
  "title": "VQP System Metrics Vocabulary v1.0.0",
  "description": "Standard vocabulary for system performance metrics",
  "type": "object",
  "properties": {
    "uptime_percentage_24h": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Uptime percentage in last 24 hours",
      "examples": [99.9, 98.5, 100.0]
    },
    "uptime_percentage_7d": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Uptime percentage in last 7 days",
      "examples": [99.8, 97.2, 99.99]
    },
    "response_time_p50_ms": {
      "type": "number",
      "minimum": 0,
      "description": "50th percentile response time in milliseconds",
      "examples": [50, 120, 200]
    },
    "response_time_p95_ms": {
      "type": "number",
      "minimum": 0,
      "description": "95th percentile response time in milliseconds",
      "examples": [150, 300, 500]
    },
    "response_time_p99_ms": {
      "type": "number",
      "minimum": 0,
      "description": "99th percentile response time in milliseconds",
      "examples": [200, 500, 1000]
    },
    "error_rate_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Error rate percentage",
      "examples": [0.1, 0.5, 2.0]
    },
    "throughput_rps": {
      "type": "number",
      "minimum": 0,
      "description": "Requests per second",
      "examples": [100, 500, 1000]
    },
    "processed_events_last_hour": {
      "type": "integer",
      "minimum": 0,
      "description": "Events processed in last hour",
      "examples": [1000, 5000, 10000]
    },
    "cpu_usage_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "CPU usage percentage",
      "examples": [25.5, 60.0, 90.2]
    },
    "memory_usage_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Memory usage percentage",
      "examples": [30.0, 75.5, 95.0]
    },
    "disk_usage_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Disk usage percentage",
      "examples": [45.2, 80.0, 95.5]
    },
    "health_status": {
      "type": "string",
      "enum": ["healthy", "degraded", "unhealthy", "unknown"],
      "description": "Overall system health status",
      "examples": ["healthy", "degraded"]
    }
  }
}
```

### Common Queries

```javascript
// SLA compliance
{
  "expr": {
    "and": [
      { ">=": [{ "var": "uptime_percentage_24h" }, 99.5] },
      { "<=": [{ "var": "response_time_p95_ms" }, 200] },
      { "<=": [{ "var": "error_rate_percentage" }, 0.1] }
    ]
  }
}

// Resource health
{
  "expr": {
    "and": [
      { "<=": [{ "var": "cpu_usage_percentage" }, 80] },
      { "<=": [{ "var": "memory_usage_percentage" }, 85] },
      { "==": [{ "var": "health_status" }, "healthy"] }
    ]
  }
}
```

## Compliance Vocabulary

**Vocabulary ID**: `vqp:compliance:v1`
**URI**: `https://vqp.dev/vocab/compliance/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/compliance/v1.0.0",
  "title": "VQP Compliance Vocabulary v1.0.0",
  "description": "Standard vocabulary for compliance and certification",
  "type": "object",
  "properties": {
    "certifications_active": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Currently active certifications",
      "examples": [["ISO-27001", "SOC2", "HIPAA"]]
    },
    "certifications_expired": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Expired certifications",
      "examples": [["PCI-DSS"], []]
    },
    "last_audit_date": {
      "type": "string",
      "format": "date",
      "description": "Date of last compliance audit",
      "examples": ["2024-03-15", "2023-11-20"]
    },
    "days_since_last_audit": {
      "type": "integer",
      "minimum": 0,
      "description": "Days since last audit",
      "examples": [30, 90, 365]
    },
    "audit_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Last audit score percentage",
      "examples": [85.5, 92.0, 98.5]
    },
    "security_incidents_12m": {
      "type": "integer",
      "minimum": 0,
      "description": "Security incidents in last 12 months",
      "examples": [0, 1, 3]
    },
    "data_breach_history": {
      "type": "boolean",
      "description": "Has history of data breaches",
      "examples": [false, true]
    },
    "privacy_policy_updated": {
      "type": "string",
      "format": "date",
      "description": "Privacy policy last updated",
      "examples": ["2024-01-01", "2023-06-15"]
    },
    "gdpr_compliant": {
      "type": "boolean",
      "description": "GDPR compliance verified",
      "examples": [true, false]
    },
    "ccpa_compliant": {
      "type": "boolean",
      "description": "CCPA compliance verified",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Vendor qualification
{
  "expr": {
    "and": [
      { "in": ["ISO-27001", { "var": "certifications_active" }] },
      { ">=": [{ "var": "audit_score" }, 85] },
      { "<=": [{ "var": "days_since_last_audit" }, 365] },
      { "==": [{ "var": "security_incidents_12m" }, 0] }
    ]
  }
}

// Privacy compliance
{
  "expr": {
    "and": [
      { "==": [{ "var": "gdpr_compliant" }, true] },
      { "==": [{ "var": "ccpa_compliant" }, true] },
      { "!": [{ "var": "data_breach_history" }] }
    ]
  }
}
```

## Academic Vocabulary

**Vocabulary ID**: `vqp:academic:v1`
**URI**: `https://vqp.dev/vocab/academic/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/academic/v1.0.0",
  "title": "VQP Academic Vocabulary v1.0.0",
  "description": "Standard vocabulary for academic credentials",
  "type": "object",
  "properties": {
    "degrees_earned": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["high_school", "associates", "bachelors", "masters", "doctorate", "professional"]
      },
      "description": "Academic degrees earned",
      "examples": [["bachelors", "masters"], ["high_school"]]
    },
    "graduation_year": {
      "type": "integer",
      "minimum": 1900,
      "maximum": 2100,
      "description": "Year of graduation",
      "examples": [2020, 2018, 2015]
    },
    "gpa": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 4.0,
      "description": "Grade Point Average",
      "examples": [3.5, 3.8, 2.9]
    },
    "enrollment_status": {
      "type": "string",
      "enum": ["enrolled", "graduated", "withdrawn", "suspended"],
      "description": "Current enrollment status",
      "examples": ["enrolled", "graduated"]
    },
    "credit_hours_current": {
      "type": "integer",
      "minimum": 0,
      "description": "Current semester credit hours",
      "examples": [12, 15, 18]
    },
    "degree_level": {
      "type": "string",
      "enum": ["undergraduate", "graduate", "postgraduate"],
      "description": "Current degree level",
      "examples": ["undergraduate", "graduate"]
    },
    "major_field": {
      "type": "string",
      "description": "Primary field of study",
      "examples": ["computer_science", "engineering", "business"]
    },
    "transcripts_verified": {
      "type": "boolean",
      "description": "Academic transcripts verified",
      "examples": [true, false]
    },
    "honors_received": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Academic honors received",
      "examples": [["magna_cum_laude", "phi_beta_kappa"], []]
    }
  }
}
```

### Common Queries

```javascript
// Student verification
{
  "expr": {
    "and": [
      { "==": [{ "var": "enrollment_status" }, "enrolled"] },
      { ">=": [{ "var": "credit_hours_current" }, 12] },
      { "==": [{ "var": "degree_level" }, "undergraduate"] }
    ]
  }
}

// Academic achievement
{
  "expr": {
    "and": [
      { "in": ["bachelors", { "var": "degrees_earned" }] },
      { ">=": [{ "var": "gpa" }, 3.5] },
      { "==": [{ "var": "transcripts_verified" }, true] }
    ]
  }
}
```

## Supply Chain Vocabulary

**Vocabulary ID**: `vqp:supply-chain:v1`
**URI**: `https://vqp.dev/vocab/supply-chain/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/supply-chain/v1.0.0",
  "title": "VQP Supply Chain Vocabulary v1.0.0",
  "description": "Standard vocabulary for supply chain verification",
  "type": "object",
  "properties": {
    "origin_country": {
      "type": "string",
      "pattern": "^[A-Z]{2}$",
      "description": "Country of origin",
      "examples": ["US", "CN", "DE", "IN"]
    },
    "manufacturing_date": {
      "type": "string",
      "format": "date",
      "description": "Date of manufacturing",
      "examples": ["2024-05-15", "2024-03-20"]
    },
    "expiry_date": {
      "type": "string",
      "format": "date",
      "description": "Product expiry date",
      "examples": ["2026-05-15", "2025-12-31"]
    },
    "batch_number": {
      "type": "string",
      "description": "Manufacturing batch number",
      "examples": ["BATCH-2024-001", "LOT-ABC123"]
    },
    "quality_certifications": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Quality certifications",
      "examples": [["ISO-9001", "FDA-approved"], ["CE-marked"]]
    },
    "fair_trade_certified": {
      "type": "boolean",
      "description": "Fair trade certification",
      "examples": [true, false]
    },
    "organic_certified": {
      "type": "boolean",
      "description": "Organic certification",
      "examples": [true, false]
    },
    "carbon_footprint_kg": {
      "type": "number",
      "minimum": 0,
      "description": "Carbon footprint in kg CO2",
      "examples": [5.2, 12.8, 0.5]
    },
    "recycled_content_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Percentage of recycled content",
      "examples": [25.0, 50.0, 80.0]
    },
    "child_labor_free": {
      "type": "boolean",
      "description": "Certified child labor free",
      "examples": [true, false]
    },
    "traceability_verified": {
      "type": "boolean",
      "description": "Supply chain traceability verified",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Ethical sourcing
{
  "expr": {
    "and": [
      { "==": [{ "var": "fair_trade_certified" }, true] },
      { "==": [{ "var": "child_labor_free" }, true] },
      { "<=": [{ "var": "carbon_footprint_kg" }, 10] }
    ]
  }
}

// Quality compliance
{
  "expr": {
    "and": [
      { "in": ["ISO-9001", { "var": "quality_certifications" }] },
      { "==": [{ "var": "traceability_verified" }, true] },
      { ">=": [{ "var": "recycled_content_percentage" }, 30] }
    ]
  }
}
```

## IoT Vocabulary

**Vocabulary ID**: `vqp:iot:v1`
**URI**: `https://vqp.dev/vocab/iot/v1.0.0`

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vqp.dev/vocab/iot/v1.0.0",
  "title": "VQP IoT Vocabulary v1.0.0",
  "description": "Standard vocabulary for IoT device metrics",
  "type": "object",
  "properties": {
    "temperature_celsius": {
      "type": "number",
      "description": "Temperature in Celsius",
      "examples": [22.5, -10.0, 45.8]
    },
    "humidity_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Relative humidity percentage",
      "examples": [45.2, 68.5, 90.0]
    },
    "battery_percentage": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Battery charge percentage",
      "examples": [85.5, 20.0, 100.0]
    },
    "signal_strength_dbm": {
      "type": "number",
      "description": "Signal strength in dBm",
      "examples": [-60, -80, -45]
    },
    "last_seen_minutes": {
      "type": "integer",
      "minimum": 0,
      "description": "Minutes since last communication",
      "examples": [5, 30, 120]
    },
    "firmware_version": {
      "type": "string",
      "description": "Current firmware version",
      "examples": ["1.2.3", "2.0.1", "0.9.5-beta"]
    },
    "security_enabled": {
      "type": "boolean",
      "description": "Security features enabled",
      "examples": [true, false]
    },
    "encryption_enabled": {
      "type": "boolean",
      "description": "Data encryption enabled",
      "examples": [true, false]
    },
    "motion_detected": {
      "type": "boolean",
      "description": "Motion detected recently",
      "examples": [true, false]
    },
    "door_open": {
      "type": "boolean",
      "description": "Door/window open status",
      "examples": [true, false]
    },
    "alarm_active": {
      "type": "boolean",
      "description": "Alarm system active",
      "examples": [true, false]
    }
  }
}
```

### Common Queries

```javascript
// Environmental monitoring
{
  "expr": {
    "and": [
      { ">=": [{ "var": "temperature_celsius" }, 18] },
      { "<=": [{ "var": "temperature_celsius" }, 25] },
      { "<=": [{ "var": "humidity_percentage" }, 60] }
    ]
  }
}

// Device health
{
  "expr": {
    "and": [
      { ">=": [{ "var": "battery_percentage" }, 20] },
      { "<=": [{ "var": "last_seen_minutes" }, 60] },
      { "==": [{ "var": "security_enabled" }, true] }
    ]
  }
}
```

## Custom Vocabulary Guidelines

### Creating Custom Vocabularies

1. **Follow Naming Conventions**: Use snake_case for field names
2. **Provide Clear Descriptions**: Each field should have a detailed description
3. **Use Appropriate Types**: Choose the most restrictive type that fits your data
4. **Add Examples**: Include realistic example values
5. **Version Properly**: Use semantic versioning (v1.0.0, v1.1.0, etc.)

### Example Custom Vocabulary

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://mycompany.com/vqp/vocab/custom/v1.0.0",
  "title": "My Company Custom Vocabulary v1.0.0",
  "description": "Custom vocabulary for company-specific data",
  "type": "object",
  "properties": {
    "employee_level": {
      "type": "string",
      "enum": ["junior", "mid", "senior", "principal", "staff"],
      "description": "Employee seniority level"
    },
    "clearance_level": {
      "type": "string",
      "enum": ["public", "internal", "confidential", "secret"],
      "description": "Security clearance level"
    },
    "years_experience": {
      "type": "integer",
      "minimum": 0,
      "description": "Years of professional experience"
    }
  }
}
```

### Publishing Vocabularies

1. **Host Schema**: Make the JSON schema accessible via HTTPS
2. **Use Stable URLs**: Ensure vocabulary URLs remain stable
3. **Document Usage**: Provide examples and use cases
4. **Maintain Backwards Compatibility**: Don't break existing queries
5. **Announce Changes**: Notify users of vocabulary updates

This vocabulary system enables semantic interoperability while allowing domain-specific extensions for specialized use cases.
