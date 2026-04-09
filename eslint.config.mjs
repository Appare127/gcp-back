import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    // 我們的自定義規則寫在這裡
    rules: {
      // 強制要求：只要引入的是型別，就必須加上 type
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  }
);
