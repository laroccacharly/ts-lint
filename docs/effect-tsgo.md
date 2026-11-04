# Effect rules with @effect/tsgo

`ts-lint` rules are syntax-only. [@effect/tsgo](https://github.com/Effect-TS/tsgo) adds about 100 type-aware Effect rules (floating Effects, chained `Effect.provide`, missing `return yield*`, ...).

Linting runs in one pass: `effect-tsgo --tsrs-lint oxlint` runs an Effect-patched oxlint whose type-aware linter runs on tsrs, the Rust port of TypeScript 7. That pass reports oxlint's rules, the `ts-lint/*` rules, typescript-eslint's type-aware rules, type errors and the Effect rules.

`ts-lint/config` turns on the Effect rules as oxlint rules (`effecttsgo/*`, from `@effect/tsgo`'s `recommended` preset), so no `tsconfig.json` plugin entry is needed. `effecttsgo/unstable-api-usage` is off because it flags every `effect/cli`, `effect/http` and `effect/sql` import on Effect 4.0.

## Setup in a consumer package

`ts-lint` depends on exact versions of `@effect/tsgo` and `oxlint`, known to work together, so the consumer installs neither: bumping the `ts-lint` tag upgrades them. tsrs ships inside `@effect/tsgo`; `oxlint-tsgolint` is not needed.

```sh
bun add -d github:laroccacharly/ts-lint#<tag>
```

```ts
// oxlint.config.ts
import tsLint, { defineConfig } from "ts-lint/config"

export default defineConfig({
  extends: [tsLint],
})
```

Change an Effect rule like any other, in the project's own `rules` (`"effecttsgo/global-date": "error"`), or silence one line with `// oxlint-disable-next-line effecttsgo/floating-effect`. Don't also add the `@effect/language-service` plugin entry to `tsconfig.json`: each Effect error would then be reported twice.

Run the `ts-lint` bin from `lint`. It runs `effect-tsgo --tsrs-lint oxlint --type-aware --type-check`; `--type-check` also reports type errors, so no separate `tsc` step is needed.

```json
{
  "scripts": {
    "lint": "ts-lint"
  }
}
```

Every argument goes to oxlint unchanged (`ts-lint --fix`, `-f json`, paths, ...).

`effect-tsgo` resolves oxlint from the working directory; the bin adds the `node_modules` holding the oxlint `ts-lint` depends on to `NODE_PATH`, so it is found with bun's isolated linker too. Don't add `oxlint` to the consumer's own dependencies: a different version would win over it.

## Versions

`effect-tsgo oxlint` runs the patched build matching the installed `oxlint`. Each `@effect/tsgo` release ships builds for a few oxlint versions (1.88 to 1.91 in 0.67.1). With another oxlint version it stops and lists the supported ones. `ts-lint` pins both, so bump them together in its `dependencies`.

tsrs runs TypeScript 7.1-beta, so type errors can differ slightly from `tsc`. `--tsrs-lint` is marked experimental upstream.

Only the patched oxlint knows the `effecttsgo` plugin: the stock `oxlint` binary, and editor extensions running it, fail on `ts-lint/config` with `Unknown plugin: 'effecttsgo'`. `effect-tsgo patch` patches the installed oxlint for them.
