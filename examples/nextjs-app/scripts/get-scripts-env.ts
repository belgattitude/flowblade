import { expand } from 'dotenv-expand';
import dotEnvFlow from 'dotenv-flow';

const rootDir = `${import.meta.dirname}/..`;

export const getScriptsEnv = () => {
  const env = expand(
    dotEnvFlow.config({
      path: `${rootDir}`,
    })
  );
  return env.parsed;
};
