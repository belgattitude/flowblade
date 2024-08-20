import type { Config } from 'tailwindcss';

const tailwindConfig: Config = {
  darkMode: 'class',
  content: ['./src/**/*.tsx', '!./src/app/api/**/*'],
};

export default tailwindConfig;
