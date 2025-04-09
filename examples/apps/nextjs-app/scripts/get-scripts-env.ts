import { expand } from 'dotenv-expand';
import { config } from 'dotenv-flow';

const rootDir = `${import.meta.dirname}/..`;

export const getScriptsEnv = () => {
  const env = expand(
    config({
      path: `${rootDir}`,
    })
  );
  return env.parsed;
};
