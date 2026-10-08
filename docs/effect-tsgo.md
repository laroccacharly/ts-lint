# Effect rules with @effect/tsgo

`ts-lint` rules are syntax-only. [@effect/tsgo](https://github.com/Effect-TS/tsgo) adds about 100 type-aware Effect rules (floating Effects, chained `Effect.provide`, missing `return yield*`, ...).

Linting runs in two steps: `oxlint` for general rules and the `ts-lint/*` plugin, then `ts-lint-effect` for the Effect rules. `ts-lint-effect` runs `effect-tsgo diagnostics`, which type-checks with its own embedded TypeScript-Go, so oxlint stays unpatched and its versions stay free. The cost is a second type-check pass, about a second on a small project.

## Setup in a consumer package

`ts-lint` declares `@effect/tsgo` as a peer dependency, so bun installs it alongside `ts-lint`. It also needs `typescript` >= 7 in the project.

```sh
bun add -d github:laroccacharly/ts-lint#<tag>
```

Run both steps from `lint`:

```json
{
  "scripts": {
    "lint": "oxlint . && ts-lint-effect"
  }
}
```

`ts-lint-effect` checks `./tsconfig.json` with the Effect rules at their default severities, except `unstableApiUsage`, which is off because it flags every `effect/cli`, `effect/http` and `effect/sql` import on Effect 4.0. No `tsconfig.json` plugin entry is needed. It exits non-zero on errors; warnings and suggestions are reported only.

Extra arguments go to `effect-tsgo diagnostics`, for example:

- `--strict`: fail on warnings too.
- `--format text|json|github-actions`: replace the default `pretty` output.
- `--project path/to/tsconfig.json`: check another project.
- `--lspconfig '<json>'`: replace the default rule config, e.g. `'{"name":"@effect/language-service","diagnosticSeverity":{"globalDate":"error"}}'`.

## Upgrading

Bump `@effect/tsgo` when a new release has rules or fixes you want. It does not depend on the installed `oxlint` or `oxlint-tsgolint` versions.
