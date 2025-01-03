type NextJsBuiltInProcessEnv = {
  HOSTNAME: string | undefined;
  PORT: string | undefined;
};

type AugmentedProcessEnv = NextJsBuiltInProcessEnv;

declare global {
  declare namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface ProcessEnv extends AugmentedProcessEnv {}
  }
}
