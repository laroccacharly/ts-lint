#!/usr/bin/env bun
// Runs the @effect/tsgo diagnostics on the project in the working directory.
// No binary patching: effect-tsgo type-checks with its own embedded TypeScript-Go.

import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"

// Enables the Effect rules without a tsconfig plugin entry.
// unstableApiUsage flags every effect/cli, effect/http and effect/sql import on Effect 4.0.
const lspConfig = {
  name: "@effect/language-service",
  diagnosticSeverity: { unstableApiUsage: "off" },
}

const require = createRequire(path.join(process.cwd(), "noop.js"))
const packageJson = require.resolve("@effect/tsgo/package.json")
const cli = path.join(path.dirname(packageJson), "dist", "effect-tsgo.cjs")

const args = process.argv.slice(2)
// A default flag, dropped when the caller passes their own.
const unless = (flag: string, value: string): string[] => (args.includes(flag) ? [] : [flag, value])

const defaults = [
  ...unless("--project", path.resolve("tsconfig.json")),
  ...unless("--lspconfig", JSON.stringify(lspConfig)),
  ...unless("--format", "pretty"),
]
const result = spawnSync(process.execPath, [cli, "diagnostics", ...defaults, ...args], { stdio: "inherit" })
process.exit(result.status ?? 1)
