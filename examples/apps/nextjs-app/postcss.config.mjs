/*
export { default } from '@examples/base-ui/postcss.config.mjs';
*/

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { '@tailwindcss/postcss': {} },
};

export default config;
