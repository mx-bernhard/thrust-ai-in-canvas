import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.yarn/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Add any custom rules here
    },
  }
); 