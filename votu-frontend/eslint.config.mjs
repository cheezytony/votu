// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
  rules: {
    // Vue
    'vue/component-api-style': ['error', ['script-setup']],
    'vue/define-macros-order': [
      'error',
      { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
    ],
    'vue/no-unused-vars': 'error',
    'vue/no-unused-refs': 'error',
    'vue/padding-line-between-blocks': 'error',
    'vue/prefer-true-attribute-shorthand': 'error',
    'vue/html-self-closing': [
      'error',
      { html: { void: 'never', normal: 'never', component: 'always' } },
    ],

    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Imports
    'import/order': 'off', // handled by Nuxt auto-imports
  },
});
