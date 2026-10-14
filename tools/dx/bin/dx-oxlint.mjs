#!/usr/bin/env node

/**
 * Runs the oxlint version pinned by @flowblade/dx, forwarding all arguments.
 *
 * Consumers don't depend on oxlint-tsgolint, so type-aware linting gets the
 * tsgolint executable from @flowblade/dx (unless OXLINT_TSGOLINT_PATH is set).
 *
 * @example dx-oxlint --fix
 */

import {
  resolveTsgolintExecutable,
  runPackageBin,
} from "./lib/run-package-bin.mjs";

runPackageBin("oxlint", {
  env: {
    OXLINT_TSGOLINT_PATH:
      process.env.OXLINT_TSGOLINT_PATH ?? resolveTsgolintExecutable(),
  },
});
