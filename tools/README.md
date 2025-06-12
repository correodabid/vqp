# VQP CLI Tool

A command-line interface for the Verifiable Query Protocol (VQP).

## Installation

```bash
npm install -g @vqp/protocol
```

Or run directly:

```bash
npx @vqp/protocol [command]
```

## Quick Start

### 1. Generate Sample Files

```bash
vqp generate --all
```

This creates:
- `vault.json` - Sample data vault
- `access-policies.json` - Access control policies

### 2. Start a VQP Responder

```bash
vqp serve --vault vault.json --port 3001
```

### 3. Send Queries

```bash
# Age verification
vqp query --target http://localhost:3001/vqp/query --age-check 18

# Citizenship check
vqp query --target http://localhost:3001/vqp/query --citizenship-check US

# Income verification
vqp query --target http://localhost:3001/vqp/query --income-check 50000

# System health check
vqp query --target http://localhost:3001/vqp/query --health-check

# Custom JSONLogic query
vqp query --target http://localhost:3001/vqp/query \
  --vocab vqp:identity:v1 \
  --expr '{"and":[{">=":[{"var":"age"},21]},{"==":[{"var":"has_drivers_license"},true]}]}'
```

### 4. Verify Responses

```bash
# Verify a saved response
vqp verify --file response.json

# Check server status
vqp status --target http://localhost:3001/vqp/query
```

## Commands

### `vqp serve`

Start a VQP responder server.

**Options:**
- `-v, --vault <path>` - Path to vault JSON file (default: ./vault.json)
- `-p, --port <number>` - Port to listen on (default: 8080)
- `--policies <path>` - Path to access policies file
- `--log-level <level>` - Log level: info, debug, error (default: info)

**Example:**
```bash
vqp serve --vault my-data.json --port 3001 --policies my-policies.json
```

### `vqp query`

Send a query to a VQP responder.

**Options:**
- `-t, --target <url>` - Target VQP responder URL (required)
- `-v, --vocab <vocab>` - Vocabulary to use (default: vqp:identity:v1)
- `-e, --expr <expression>` - JSONLogic expression as JSON string
- `--age-check <age>` - Quick age verification (>= age)
- `--citizenship-check <country>` - Quick citizenship check
- `--income-check <amount>` - Quick income verification (>= amount)
- `--health-check` - Quick system health check
- `-o, --output <file>` - Save response to file
- `--verify` - Verify the response automatically (default: true)
- `--requester <did>` - Requester DID (default: did:example:cli-user)

**Examples:**
```bash
# Quick age check
vqp query -t http://localhost:3001/vqp/query --age-check 21

# Save response to file
vqp query -t http://localhost:3001/vqp/query --age-check 18 -o age-check.json

# Complex query
vqp query -t http://localhost:3001/vqp/query \
  --vocab vqp:financial:v1 \
  --expr '{"and":[{">=":[{"var":"annual_income"},75000]},{"==":[{"var":"employment_status"},"employed"]}]}'
```

### `vqp verify`

Verify a VQP response from a file.

**Options:**
- `-f, --file <path>` - Path to response JSON file (required)
- `--query-id <id>` - Original query ID to verify against

**Example:**
```bash
vqp verify --file age-response.json --query-id 550e8400-e29b-41d4-a716-446655440000
```

### `vqp status`

Check the status of a VQP responder.

**Options:**
- `-t, --target <url>` - Target VQP responder URL (required)

**Example:**
```bash
vqp status --target http://localhost:3001/vqp/query
```

### `vqp generate`

Generate sample configuration files.

**Options:**
- `--vault` - Generate sample vault.json
- `--policies` - Generate sample access-policies.json
- `--all` - Generate all sample files

**Example:**
```bash
vqp generate --all
```

## Vocabularies

The CLI supports standard VQP vocabularies:

- `vqp:identity:v1` - Personal identity (age, citizenship, credentials)
- `vqp:financial:v1` - Financial information (income, employment)
- `vqp:health:v1` - Health data (vaccinations, conditions)
- `vqp:metrics:v1` - System metrics (uptime, performance)
- `vqp:compliance:v1` - Compliance and certifications
- `vqp:academic:v1` - Academic credentials
- `vqp:supply-chain:v1` - Supply chain verification
- `vqp:iot:v1` - IoT device metrics

## Response Format

Responses are saved in JSON format with both query and response:

```json
{
  "query": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0",
    "timestamp": "2025-06-12T04:25:14.847Z",
    "requester": "did:example:cli-user",
    "query": {
      "lang": "jsonlogic@1.0.0",
      "vocab": "vqp:identity:v1",
      "expr": { ">=": [{ "var": "age" }, 18] }
    }
  },
  "response": {
    "queryId": "550e8400-e29b-41d4-a716-446655440000",
    "version": "1.0.0",
    "timestamp": "2025-06-12T04:25:14.872Z",
    "responder": "did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp",
    "result": true,
    "proof": {
      "type": "signature",
      "algorithm": "ed25519",
      "publicKey": "669bb9c2c55f24de...",
      "signature": "893c82f21e45d9fe..."
    }
  },
  "timestamp": "2025-06-12T04:25:14.986Z"
}
```

## Demo Script

Run the complete demo:

```bash
./tools/demo.sh
```

This demonstrates:
- ✅ Server startup/shutdown
- ✅ Multiple query types
- ✅ Cryptographic verification
- ✅ Access control policies
- ✅ Response file handling

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -ti:3001

# Kill process
kill $(lsof -ti:3001)
```

### Verification Failures

- Ensure the responder is using the same cryptographic keys
- Check that timestamps are within acceptable range (±5 minutes)
- Verify the response file format is correct

### Access Denied Errors

- Check access policies in `access-policies.json`
- Ensure the requester DID has permissions for the requested data paths
- Review the vault structure in `vault.json`

## Development

```bash
# Run CLI directly during development
npx tsx tools/cli.ts [command]

# Build and test
npm run build
npm test
```
