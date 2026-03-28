import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
    // ── Globally ignored paths ──────────────────────────────────────────
    { ignores: ['dist/', 'node_modules/', '**/*.d.ts'] },

    // ── Production source files — full typed linting ────────────────────
    {
        files: ['src/**/*.ts'],
        ignores: ['src/**/__tests__/**'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
            globals: { ...globals.node },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...js.configs.recommended.rules,

            // Disable base rules that produce false positives in TypeScript
            // TypeScript's type system handles these checks more accurately
            'no-unused-vars': 'off',   // replaced by @typescript-eslint/no-unused-vars
            'no-redeclare': 'off',     // TypeScript handles type + const declaration merging
            'no-undef': 'off',         // TypeScript handles undefined global types (e.g. RequestInit)

            // TypeScript strict rules
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',

            // Security: block risky patterns
            'no-eval': 'error',
            'no-implied-eval': 'error',

            // Cloud Functions must use firebase-functions logger — never bare console
            'no-console': 'error',

            // Code quality
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
        },
    },

    // ── Test files — relaxed rules (no typed linting, console allowed) ───
    {
        files: ['src/**/__tests__/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            globals: { ...globals.node },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...js.configs.recommended.rules,
            // Disable base rules that produce false positives in TypeScript
            'no-unused-vars': 'off',
            'no-redeclare': 'off',
            'no-undef': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            'no-console': 'off',
            'no-eval': 'error',
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
];
