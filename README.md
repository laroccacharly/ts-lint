# ts-lint

[oxlint](https://oxc.rs) JS plugin with rules for [Effect](https://effect.website) TypeScript code.

## Demo

[![ts-lint demo](https://img.youtube.com/vi/3FGAsT1NoWo/maxresdefault.jpg)](https://youtu.be/3FGAsT1NoWo)

The source is `plugin.ts`; `plugin.js` is its build (`bun run build`), committed because Node does not strip types under `node_modules`.

## Usage

```sh
bun add -d github:laroccacharly/ts-lint#v0.8.0
```

`ts-lint/config` registers the plugin and enables every rule. Override a rule in the project's own `rules`.

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint"
import tsLint from "ts-lint/config"

export default defineConfig({
  extends: [tsLint],
})
```

Run it with `effect-tsgo --tsrs-lint oxlint --type-aware --type-check` to get type errors and the type-aware Effect rules from [@effect/tsgo](https://github.com/Effect-TS/tsgo) in the same pass: see [docs/effect-tsgo.md](docs/effect-tsgo.md). Upgrading from v0.7: [docs/migrate-to-effect-tsgo-oxlint.md](docs/migrate-to-effect-tsgo-oxlint.md).

## Releasing

Pin a tag in consumers (`github:laroccacharly/ts-lint#v0.8.0`) so a new version is a new specifier and bun fetches it, rather than reusing a cached `main`.

```sh
bun run build
# bump "version" in package.json, then:
git commit -am "v0.8.0" && git tag v0.8.0 && git push origin main v0.8.0
```
