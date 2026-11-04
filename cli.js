#!/usr/bin/env node
// `ts-lint [oxlint args]`: lints the project in one pass with the oxlint and @effect/tsgo versions ts-lint pins.
// effect-tsgo resolves oxlint from the working directory: NODE_PATH points it at ts-lint's oxlint when bun doesn't
// hoist it (isolated linker), while the working directory stays the project's, for its config and paths.

import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { delimiter, dirname, join } from "node:path"

// @effect/tsgo exports its package.json but not its bin.
const require = createRequire(import.meta.url)
const tsgoPackage = require.resolve("@effect/tsgo/package.json")
const effectTsgo = join(dirname(tsgoPackage), require(tsgoPackage).bin["effect-tsgo"])
const args = [effectTsgo, "--tsrs-lint", "oxlint", "--type-aware", "--type-check", ...process.argv.slice(2)]
const oxlintModules = dirname(dirname(require.resolve("oxlint/package.json")))
const nodePath = [oxlintModules, process.env.NODE_PATH].filter(Boolean).join(delimiter)
const env = { ...process.env, NODE_PATH: nodePath }
const { status, error } = spawnSync(process.execPath, args, { stdio: "inherit", env })
if (error) {
  throw error
}
process.exit(status ?? 1)
