import { VQPSystem } from "../lib";

async function runCompleteDemo() {

    const vqpSystem = new VQPSystem({
        data: {
        type: 'filesystem',
        vaultPath: './examples/sample-vault.json',
        policiesPath: './examples/access-policies.json'
      },
        crypto: {type:'software'},
        vocabulary: {type:'http'},
        audit: {type:'console', logLevel: 'info'},
        evaluation:{
          type: 'jsonlogic',
        }
    });
    
    const vqpService = vqpSystem.getService();

    const query = {
        id: generateUUID(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        requester: 'did:example:test-querier',
        query: {
          lang: 'jsonlogic@1.0.0' as const,
          vocab: 'vqp:identity:v1',
          expr: { '>=': [{ 'var': 'age' }, 18] }
        }
    }

    console.log('🔍 Processing query:', query);
    const response = await vqpService.processQuery(query);
    console.log('📄 Response generated:', response);

    console.log('🔐 Verifying response...');
    const isValid = await vqpSystem.verify(response, query.id);
    console.log('✅ Verification result:', isValid);

    console.log('Demo completed:', { 
      result: response.result, 
      verified: isValid,
      queryId: query.id,
      responseId: response.queryId
    });

}

/**
 * Generate a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function demoWithQueryBuilder() {
    console.log('\n🔨 Demo with QueryBuilder...');
    
    const vqpSystem = new VQPSystem({
        data: {
            type: 'filesystem',
            vaultPath: './examples/sample-vault.json',
            policiesPath: './examples/access-policies.json'
        },
        crypto: {type:'software'},
        vocabulary: {type:'http'},
        audit: {type:'console', logLevel: 'info'},
        evaluation:{
          type: 'jsonlogic',
        }
    });
    
    
    const { QueryBuilder } = await import('../lib');
    
    // Use QueryBuilder for cleaner query construction
    const query = new QueryBuilder()
        .requester('did:example:test-querier')
        .ageCheck(18)
        .build();
    
    console.log('🔍 Query built:', query);
    
    const vqpService = vqpSystem.getService();
    const response = await vqpService.processQuery(query);
    
    const verifier = vqpSystem.createVerifier();
    const verificationResult = await verifier.verifyComplete(response, query.id);
    
    console.log('✅ Complete verification:', verificationResult);
    
}

// Run both demos
runCompleteDemo()
    .then(() => demoWithQueryBuilder())
    .catch(console.error);