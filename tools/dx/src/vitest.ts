export {
  createVitestConfig,
  type CreateVitestConfigOptions,
} from "./vitest/create-vitest-config.ts";
// Re-exported so consumers only depend on @flowblade/dx
export * from "vitest/config";
