import { defineConfig } from 'react-doctor/api';

export default defineConfig({
  ignore: {
    rules: ['react-doctor/no-danger'],
    files: ['src/generated/**'],
    overrides: [
      {
        files: ['components/search/HighlightedSnippet.tsx'],
        rules: ['react-doctor/no-danger'],
      },
    ],
  },
  rules: {
    'react-doctor/no-array-index-as-key': 'error',
  },
  categories: {
    Maintainability: 'warn',
  },
});
