# Migrating from oxlint to `bun lint` and `bun fmt`

Bun now has a built-in linter (`bun lint`) and formatter (`bun fmt`). `bun lint` runs oxlint's rules natively and loads ESLint-API plugins such as `ts-lint`, so `oxlint` can be dropped here and in consumers. `bun fmt` lets consumers share one formatting style through `ts-lint`.

**Status (2026-11-01):** findings come from a prototype run against `bun@canary` (`1.4.4-canary.1+3f3a9ff87`). `bun lint` landed in oven-sh/bun#45043 (merged 2026-10-13) and is only on canary; stable 1.4.4 has no `bun lint`. `bun fmt` is already on stable 1.4.4. The plan is to migrate once `bun lint` ships in a stable release. Nothing below is applied yet.

Docs: [bun lint](https://bun.com/docs/lint), [plugins](https://bun.com/docs/lint/plugins), [rules](https://bun.com/docs/lint/rules), [migrate from oxlint](https://bun.com/docs/guides/lint/migrate-from-oxlint), [bun fmt](https://bun.com/docs/format), [`[lint]` and `[fmt]` in bunfig.toml](https://bun.com/docs/runtime/bunfig#linter).

## The Bun commands

- `bun lint`: the linter. Reads `oxlint.config.ts` / `.oxlintrc.json` (including `jsPlugins`, `extends` and `overrides`), an ESLint config, or a `[lint]` section in `bunfig.toml`. Without any of them, it uses Bun's defaults (ESLint and typescript-eslint recommended).
- `bun lint --doctor`: shows which rules run natively, which run in JavaScript, and which packages can be removed.
- `bun lint --type-aware --type-check`: type-aware rules plus type errors, through Bun's built-in type checker.
- `bun fmt`: Prettier-compatible formatter. Configured by `.prettierrc` / `prettier.config.js` or a `[fmt]` section in `bunfig.toml`. `bun format` is no longer a command.
- `bun check`: the built-in type checker (tsc-compatible). Not a linter.

If `package.json` has a `lint` (or `fmt`) script, `bun lint` (`bun fmt`) runs that script instead of the built-in. So either make the script itself `bun lint`, or pass `--no-script`.

## What was verified

### Rule parity

A throwaway consumer project installed `ts-lint` as a package, extended `ts-lint/config` from `oxlint.config.ts`, and linted fixtures that break every rule. oxlint 1.86 and `bun lint` were compared on the same config.

| Rule | Findings, positions, messages | `--fix` |
|---|---|---|
| `ts-lint/no-unknown` (`cause: unknown` exempt) | identical | no fixer |
| `ts-lint/no-undefined` (type, value; `=== undefined` allowed) | identical | no fixer |
| `ts-lint/no-try-promise` (off under `adapters/`) | identical | no fixer |
| `ts-lint/no-ternary` | identical | no fixer |
| `ts-lint/no-tag-compare` (tag on either side) | identical | no fixer |
| `ts-lint/no-run-promise` (off in tests) | identical | no fixer |
| `ts-lint/bun-serve-idle-timeout` (off in tests) | identical | no fixer |
| `ts-lint/effect-fn-return-type` | identical | no fixer |
| `import/no-duplicates` | identical | identical rewrite |
| `max-depth: 2` | identical | n/a |
| `oxlint-disable-next-line` comment | respected | - |

`-f unix` output was byte-identical (after sorting; Bun sorts by file and line, oxlint prints in thread order). `-f json` matched on spans, codes, severities and messages. Exit codes matched. Only Bun's default `pretty` layout differs from oxlint's.

### No oxlint package needed

With `oxlint` deleted from `node_modules`, `bun lint` still gave identical results:

- `import { defineConfig } from "oxlint"` keeps working for `bun lint`, which stubs it. But the consumer's `tsc` / `bun check` then fails with `TS2307: Cannot find module 'oxlint'` if `oxlint.config.ts` is in the tsconfig `include`. So drop `defineConfig` and export a plain object.
- `config.d.ts` imports `OxlintConfig` from `"oxlint"`. With `skipLibCheck` this is silent but turns the config into an untyped value. It needs its own type.
- `bun lint --doctor` reports `Still needed: ts-lint (its rules run in JavaScript)` and nothing else.

### Ways to share the config

| Option | Result |
|---|---|
| Consumer `oxlint.config.ts` with `extends: [tsLint]`, no `defineConfig` | Works, identical. **Chosen.** Keeps oxlint's defaults and output, and works for oxlint too during the transition. |
| `bunfig.toml` `[lint] config = "node_modules/ts-lint/.oxlintrc.json"` | Works, identical; local `[lint.rules]` apply on top. Needs a JSON copy of the config shipped in the package and a hard-coded `node_modules` path. |
| `bunfig.toml` `config =` / `-c` pointing at a `.js` file in the package | Does not work: any `.js` file named this way is read as an ESLint flat config, even named `oxlint.config.js` and with `--flavor=oxlint`, and 0 files get linted. Looks like a Bun bug. |
| Pure `bunfig.toml` `[lint]` (`plugins = ["ts-lint"]`, `[lint.rules]`, `[[lint.overrides]]`) | Same `ts-lint` findings, but on top of Bun's own defaults (145 rules on), ESLint-style output, and `import/no-duplicates` reports both lines. bunfig has no `extends`, so each consumer would copy every rule. |
| ESLint flat config | Poor fit: `import/no-duplicates` errors with `Could not find plugin "import"` unless `eslint-plugin-import` is installed, and `oxlint-disable` comments are ignored. |

### Loading the plugin

- `plugins = ["ts-lint"]` and `jsPlugins: ["ts-lint"]` resolve the package from `node_modules`; the rule prefix comes from `meta.name`. `{ name = "fx", specifier = "ts-lint" }` renames the prefix.
- Bun loads `plugin.ts` and a `config.ts` straight from `node_modules` (through `exports`). With `plugin.js` deleted and `exports` pointing at the `.ts` files, results were identical. The `plugin.js` build and the plain-JS `config.js` exist only because oxlint loads them with Node.

### Type checking and Effect diagnostics

- `bun lint --type-aware --type-check` (or `typeAware = true` / `typeCheck = true` in `[lint]`) reports the same type errors as `tsc` (checked: TS2322 on a value and on an `Effect` type), plus typescript-eslint's type-aware rules such as `no-floating-promises`. It replaces a separate `tsc --noEmit` step.
- Nothing replaces `ts-lint-effect`. A floating `Effect.log(...)` was reported by `ts-lint-effect` (`effect(floatingEffect)`) and not by `bun lint --type-aware`. `bun lint` has no Effect rules, and JavaScript plugin rules get no types (`parserServices.program` is `null`), so they can't be written as `ts-lint` rules either. `@effect/tsgo` and `ts-lint-effect` stay.

### Formatting

`bun fmt` can load a shared Prettier config from a package, on stable 1.4.4 and on canary, without the `prettier` package installed:

- `.prettierrc` containing the string `"ts-lint/prettier"`: works.
- `"prettier": "ts-lint/prettier"` in `package.json`: works.
- `prettier.config.js` spreading the shared object and changing a key (`{ ...config, singleQuote: true }`): works, for consumers that need a local change.
- The specifier must be listed in `exports` of `ts-lint`'s `package.json`, or loading fails with `Cannot find module`.

A `[fmt]` section in `bunfig.toml` can't be shared: bunfig has no `extends`.

The style matching this repo's code is `semi: false` with `printWidth: 120` and Prettier's other defaults (double quotes, trailing commas). At 120, `bun fmt` only rewraps a few long lines in `plugin.ts`; at 80 and 100 more files change.

The built-in `bun/format` lint rule compares each file with `bun fmt` output and reads the same config. It works in an oxlint-format config, and `bun lint --fix` then formats the file. Putting it in the shared config makes `bun lint` fail on unformatted code, so consumers need no separate format check. oxlint doesn't know `bun/format`, so it can only go in once oxlint is dropped.

## Gaps and risks

- **Canary only.** The blocker: wait for `bun lint` in a stable Bun release.
- **No language server.** `bun lint --lsp` is an error, so editors get no lint diagnostics from Bun. Not a concern for this project.
- A rule that throws: with an oxlint config, Bun reports it and continues; with bunfig alone, the run ends with exit code `2`.
- The `config =` / `-c` bug with `.js` files described above. Not needed by the chosen setup.
- `bun lint` follows oxlint 1.87's rules, whatever oxlint version was installed before.

## Migration

Once `bun lint` is in a stable Bun release:

### In ts-lint

1. `oxlint.config.ts`: drop the `defineConfig` import and export a plain object.
2. `config.js` → `config.ts`: add `"bun/format": "error"` to its rules; `config.d.ts` goes away.
3. Add `prettier.json`:

   ```json
   { "semi": false, "printWidth": 120 }
   ```

   and add `.prettierrc` containing `"./prettier.json"` so this repo uses the same style.
4. `package.json`:
   - `exports`: `"."` → `./plugin.ts`, `"./config"` → `./config.ts`, add `"./prettier": "./prettier.json"`.
   - `files`: drop `plugin.js`, `config.js` and `config.d.ts`, add `config.ts` and `prettier.json`.
   - `scripts`: drop `build`; `"lint": "bun lint --type-aware --type-check"`.
   - Remove `oxlint` from `devDependencies`.
5. Delete `plugin.js`. Run `bun lint --fix` once to format the repo.
6. Update `README.md` and `docs/effect-tsgo.md` (they describe the oxlint setup), then release a new tag.

Steps 2 and 4 make the package unloadable by oxlint (TypeScript under `node_modules`, and the `bun/format` rule), so consumers move in the same release.

### In each consumer

1. Bump `ts-lint` to the new tag: `bun remove ts-lint && bun add -d github:laroccacharly/ts-lint#<tag>`.
2. `bun remove oxlint oxlint-tsgolint` (whichever are installed).
3. `oxlint.config.ts`:

   ```ts
   import tsLint from "ts-lint/config"

   export default {
     extends: [tsLint],
   }
   ```

4. `.prettierrc`:

   ```json
   "ts-lint/prettier"
   ```

   Remove other formatter configs (`.oxfmtrc.json`, a `[fmt]` section) and the `prettier` / `oxfmt` packages.
5. `package.json` scripts, replacing any separate `tsc` / format check step:

   ```json
   {
     "scripts": {
       "lint": "bun lint --type-aware --type-check && ts-lint-effect"
     }
   }
   ```

   `bun lint --fix` fixes lint problems and formats; `bun fmt` formats alone.
6. Run `bun lint --fix` once and commit the reformatting on its own.
7. Check with `bun lint --doctor`: `Still needed` should list only `ts-lint`.
