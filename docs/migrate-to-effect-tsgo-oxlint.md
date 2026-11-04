# Migrating to `effect-tsgo --tsrs-lint oxlint`: one lint pass

Since `@effect/tsgo` 0.67.0, `effect-tsgo oxlint` runs an Effect-patched oxlint and its type-aware linter, and `--tsrs-lint` puts that linter on tsrs (the Rust port of TypeScript 7). One command then runs oxlint's rules, the `ts-lint/*` rules, typescript-eslint's type-aware rules, type errors and the Effect rules. This replaces `ts-lint-effect` and its second type-check pass.

This is an alternative to [migrating to `bun lint`](migrate-oxlint-to-bun.md), which can't run the Effect rules.

**Status (2026-11-04):** applied in `ts-lint` v0.8.0. Findings come from a prototype with `@effect/tsgo` 0.67.1, oxlint 1.91.0 and Effect 4.1.2. `--tsrs-lint` is marked experimental upstream. The setup itself is in [effect-tsgo.md](effect-tsgo.md).

Docs: [@effect/tsgo](https://github.com/Effect-TS/tsgo), `effect-tsgo --help`.

## The command

```sh
effect-tsgo --tsrs-lint oxlint --type-aware --type-check
```

- Every argument after `oxlint` goes to oxlint unchanged, so the config (`oxlint.config.ts` with `extends: [tsLint]`) and flags stay as they are.
- `effect-tsgo oxlint` uses the patched build matching the installed `oxlint`. `@effect/tsgo` 0.67.1 ships builds for oxlint 1.88 to 1.91.
- `effect-tsgo --tsrs-lint=<version|tag> vp lint` does the same for vite-plus.

## What was verified

A throwaway consumer installed `ts-lint`, `oxlint`, `@effect/tsgo`, `typescript` and `effect`, extended `ts-lint/config` and linted a file with a floating `Effect.log(...)`, a type error, a floating promise, a ternary and a duplicate import.

| Check | Result |
|---|---|
| `import/no-duplicates`, `ts-lint/no-ternary` | reported, same as plain oxlint |
| `typescript/no-floating-promises` | reported |
| Type error (TS2322) through `--type-check` | reported |
| `effect(floatingEffect)` | reported as `typescript(TS377001)`, same message as `ts-lint-effect` |
| Exit code on errors | `1` |
| `diagnosticSeverity` in the tsconfig plugin entry | respected (`floatingEffect: "off"` silences it) |
| Time on the fixture | 0.35 s for the whole run |

- `oxlint` is still needed: without it, `effect-tsgo oxlint` stops with `Unable to resolve oxlint from <dir>. Install oxlint (or vite-plus) in the project.` The installed version picks the patched build to run.
- `oxlint-tsgolint` is not needed: tsrs, the patched oxlint and the patched tsgolint all ship in `@effect/tsgo-linux-x64` (and the other platform packages). Nothing is downloaded at lint time. The cost is a 245 MB platform package.
- **The Effect rules must be turned on**, or none runs and nothing says so. Either through the `@effect/language-service` plugin entry in `tsconfig.json`, or as oxlint rules: `@effect/tsgo/oxlint-presets` exports presets (`recommended` matches the language service defaults) enabling the `effecttsgo/*` rules. Since v0.8.1 `ts-lint/config` spreads `recommended`, so consumers need no plugin entry. With both, each Effect error is reported twice.
- Through the oxlint rules, `oxlint-disable` comments and `overrides` apply to the Effect rules too. The stock `oxlint` binary rejects the config (`Unknown plugin: 'effecttsgo'`).
- Without `--tsrs-lint` (patched tsgolint, `oxlint-tsgolint` installed), the floating Effect was not reported. Only the tsrs path was made to work.

## Gaps and risks

- **Experimental**, and on a beta compiler: tsrs runs TypeScript 7.1-beta while tsgolint runs 7.0.2, so results can differ from `tsc`.
- The oxlint version is tied to the builds shipped by `@effect/tsgo`: bumping oxlint past them waits for an `@effect/tsgo` release. `ts-lint-effect` left oxlint free.
- Editor extensions running the stock oxlint fail on the config until `effect-tsgo patch` patches the installed oxlint.
- Editors: the oxlint language server is unpatched, so Effect diagnostics in the editor still come from the TypeScript language service with the plugin entry.

## Migration

### In ts-lint (done in v0.8.0)

- Removed `effect-lint.ts` and the `ts-lint-effect` bin.
- `lint` is `effect-tsgo --tsrs-lint oxlint --type-aware --type-check`, with a `tsconfig.json` for this repo.
- Peer dependencies: `@effect/tsgo` `>=0.67.1` and `oxlint` `>=1.88.0`. An oxlint version without a patched build fails with a message listing the supported ones.

v0.9.0: `@effect/tsgo` and `oxlint` are exact `dependencies` instead of peers, the `ts-lint` bin runs the command, and `ts-lint/config` re-exports `defineConfig`. Consumers install neither package and their `lint` is `ts-lint`.

v0.8.1: `ts-lint/config` enables the `effecttsgo/*` rules (`recommended` preset, `unstable-api-usage` off), so the `tsconfig.json` plugin entry is no longer needed.

### In each consumer

1. Bump `ts-lint`: `bun remove ts-lint && bun add -d github:laroccacharly/ts-lint#<tag>`, with the latest tag (v0.9.0 or later).
2. `bun remove oxlint oxlint-tsgolint @effect/tsgo`, whichever are installed: `ts-lint` brings the versions it supports.
3. Keep `oxlint.config.ts` as `extends: [tsLint]`, importing `defineConfig` from `ts-lint/config` instead of `oxlint`. Don't add an `@effect/language-service` plugin entry to `tsconfig.json`, and remove it if v0.8.0 had you add one: Effect errors would be reported twice.

4. `package.json` scripts, replacing `oxlint . && ts-lint-effect` or `effect-tsgo --tsrs-lint oxlint ...`, and any separate `tsc` step:

   ```json
   {
     "scripts": {
       "lint": "ts-lint"
     }
   }
   ```

5. Check that a floating `Effect.log(...)` fails `bun run lint` with `effecttsgo(floating-effect)`.
