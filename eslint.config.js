import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  // Base JavaScript rules
  js.configs.recommended,
  
  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
        // Removed project reference to avoid path issues
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        global: 'readonly',
        NodeJS: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node.js crypto module
        crypto: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript specific rules - more relaxed for development
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any during development
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // General code quality rules - relaxed
      'no-console': 'off', // Allow console.log everywhere
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': 'warn',
      'curly': 'off', // Allow single-line if statements
      'no-unused-vars': 'off', // Let TypeScript handle this
      
      // Security rules - keep strict
      'no-eval': 'error',
      'no-implied-eval': 'error',
    }
  },
  
  // Test files configuration
  {
    files: ['**/*.test.ts', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off'
    }
  },
  
  // Example files configuration
  {
    files: ['examples/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  
  // Tool files configuration
  {
    files: ['tools/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  
  // Port interface files (allow unused parameters)
  {
    files: ['**/ports/**/*.ts', '**/domain/ports/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off'
    }
  },
  
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'logs/**',
      '**/*.js', // Ignore compiled JS files
      '**/*.d.ts', // Ignore type definition files
      'circuits/**', // Ignore circuit files
      'packages/node_modules/**',
      '**/node_modules/**'
    ]
  }
];
