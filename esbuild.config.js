import { build } from 'esbuild';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const external = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
  // Node.js built-ins
  'node:crypto',
  'node:fs',
  'node:path',
  'node:url',
  'node:buffer',
  'node:stream',
  'node:util',
  'crypto',
  'fs',
  'path',
  'url',
  'buffer',
  'stream',
  'util',
  'http',
  'https',
  'net',
  'os',
  'events'
];

const baseConfig = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  external,
  sourcemap: true,
  minify: false, // Keep readable for library
  keepNames: true,
  outdir: 'dist',
  entryNames: '[dir]/[name]',
  chunkNames: '[name]-[hash]',
  splitting: false, // Disable for library
  metafile: true,
  logLevel: 'info'
};

async function buildLibrary() {
  console.log('🚀 Building VQP library with esbuild...');

  // Main library bundle
  await build({
    ...baseConfig,
    entryPoints: [
      'lib/index.ts',
      'crypto.ts',
      'transport.ts', 
      'data.ts'
    ],
    outdir: 'dist'
  });

  // CLI tools
  await build({
    ...baseConfig,
    entryPoints: ['tools/cli.ts', 'tools/benchmark.ts'],
    outdir: 'dist/tools',
    // Remove banner for CLI tools - causes issues with ES modules
  });

  // Examples
  await build({
    ...baseConfig,
    entryPoints: [
      'examples/basic-example.ts',
      'examples/complete-example.ts',
      'examples/zk-proof-example.ts',
      'examples/quickstart.ts'
    ],
    outdir: 'dist/examples'
  });

  console.log('✅ Build completed successfully!');
}

// Build types separately with tsc
async function buildTypes() {
  console.log('📝 Building TypeScript declarations...');
  
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    const tsc = spawn('npx', ['tsc', '--emitDeclarationOnly', '--declaration'], {
      stdio: 'inherit'
    });
    
    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Type declarations built successfully!');
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
  });
}

// Main build function
async function main() {
  try {
    await Promise.all([
      buildLibrary(),
      buildTypes()
    ]);
    
    console.log('🎉 Complete build finished!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { buildLibrary, buildTypes, main as build };
