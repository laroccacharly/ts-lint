# ts-lint

[oxlint](https://oxc.rs) JS plugin with rules for [Effect](https://effect.website) TypeScript code.

The source is `plugin.ts`; `plugin.js` is its build (`bun run build`), committed because Node does not strip types under `node_modules`.

| Rule | What it reports |
| --- | --- |
| `ts-lint/no-unknown` | `unknown` in types; use the real type, or `void` when nothing is returned. |
| `ts-lint/no-undefined` | `A \| undefined` types and `undefined` values; use `Option`. Comparing with `undefined` is allowed. |
| `ts-lint/effect-fn-return-type` | `const f = Effect.fn(...)` without a `(...) => Effect.Effect<A, E, R>` annotation. |

## Usage

```sh
bun add -d github:laroccacharly/ts-lint
```

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint"

export default defineConfig({
  jsPlugins: ["ts-lint"],
  rules: {
    "ts-lint/no-unknown": "warn",
    "ts-lint/effect-fn-return-type": "error",
    "ts-lint/no-undefined": "error",
  },
})
```
