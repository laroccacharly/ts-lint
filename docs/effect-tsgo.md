# Effect rules with @effect/tsgo

`ts-lint` rules are syntax-only. [@effect/tsgo](https://github.com/Effect-TS/tsgo) adds about 100 type-aware Effect rules (floating Effects, chained `Effect.provide`, missing `return yield*`, ...).

Linting runs in one pass: `effect-tsgo --tsrs-lint oxlint` runs an Effect-patched oxlint whose type-aware linter runs on tsrs, the Rust port of TypeScript 7. That pass reports oxlint's rules, the `ts-lint/*` rules (via `extends: [tsLint]` from `ts-lint/config`), typescript-eslint's type-aware rules, type errors and the Effect rules.

## Setup in a consumer package

`ts-lint` declares `@effect/tsgo` and `oxlint` as peer dependencies, so bun installs them alongside `ts-lint`. tsrs ships inside `@effect/tsgo`; `oxlint-tsgolint` is not needed.

```sh
bun add -d github:laroccacharly/ts-lint#<tag>
```

Turn on the Effect rules in `tsconfig.json`. Without this entry no Effect rule runs, and nothing says so. `unstableApiUsage` is off because it flags every `effect/cli`, `effect/http` and `effect/sql` import on Effect 4.0.

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@effect/language-service", "diagnosticSeverity": { "unstableApiUsage": "off" } }]
  }
}
```

The same entry sets other rule severities, e.g. `"globalDate": "error"`, and gives the editor the Effect diagnostics through the TypeScript language service.

Run it from `lint`. `--type-check` also reports type errors, so no separate `tsc` step is needed.

```json
{
  "scripts": {
    "lint": "effect-tsgo --tsrs-lint oxlint --type-aware --type-check"
  }
}
```

Every argument after `oxlint` goes to oxlint unchanged (`--fix`, `-f json`, paths, ...).

## Versions

`effect-tsgo oxlint` runs the patched build matching the installed `oxlint`. Each `@effect/tsgo` release ships builds for a few oxlint versions (1.88 to 1.91 in 0.67.1). With another oxlint version it stops and lists the supported ones; bump `@effect/tsgo` or pin `oxlint` to one of them.

tsrs runs TypeScript 7.1-beta, so type errors can differ slightly from `tsc`. `--tsrs-lint` is marked experimental upstream.
