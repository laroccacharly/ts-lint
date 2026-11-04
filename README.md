# ts-lint

[oxlint](https://oxc.rs) JS plugin with rules for [Effect](https://effect.website) TypeScript code.

## Demo

[![ts-lint demo](https://img.youtube.com/vi/3FGAsT1NoWo/maxresdefault.jpg)](https://youtu.be/3FGAsT1NoWo)

The source is `plugin.ts`; `plugin.js` is its build (`bun run build`), committed because Node does not strip types under `node_modules`.

## Usage

```sh
bun add -d github:laroccacharly/ts-lint#<tag>
```

`<tag>` is the latest [tag](https://github.com/laroccacharly/ts-lint/tags), e.g. `v1.2.3`.

`ts-lint/config` registers the plugin and enables every rule. Override a rule in the project's own `rules`.

```ts
// oxlint.config.ts
import tsLint, { defineConfig } from "ts-lint/config"

export default defineConfig({
  extends: [tsLint],
})
```

Run it with the `ts-lint` bin (`"lint": "ts-lint"`): it runs the oxlint and [@effect/tsgo](https://github.com/Effect-TS/tsgo) versions ts-lint pins, and reports type errors and the type-aware Effect rules in the same pass: see [docs/effect-tsgo.md](docs/effect-tsgo.md). Upgrading from v0.8 or earlier: [docs/migrate-to-effect-tsgo-oxlint.md](docs/migrate-to-effect-tsgo-oxlint.md).

## Releasing

Pin a tag in consumers (`github:laroccacharly/ts-lint#<tag>`) so a new version is a new specifier and bun fetches it, rather than reusing a cached `main`.

Bump `version` in `package.json`, then `bun run release`: it builds, commits, tags `v<version>` and pushes.
