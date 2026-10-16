import { defineConfig } from "oxlint"

export default defineConfig({
  jsPlugins: ["./plugin.ts"],
  ignorePatterns: ["plugin.js"],
  rules: {
    "ts-lint/no-unknown": "warn",
    "ts-lint/effect-fn-return-type": "error",
    "ts-lint/no-ternary": "warn",
    "max-depth": ["error", { max: 2 }],
    // The plugin walks ESTree nodes, plain TypeScript rather than Effect code.
    "ts-lint/no-undefined": "off",
  },
})
