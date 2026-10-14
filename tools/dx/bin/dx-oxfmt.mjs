#!/usr/bin/env node

/**
 * Runs the oxfmt version pinned by @flowblade/dx, forwarding all arguments.
 *
 * @example dx-oxfmt --write
 */

import { runPackageBin } from "./lib/run-package-bin.mjs";

runPackageBin("oxfmt");
