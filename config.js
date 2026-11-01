// oxlint config enabling every ts-lint rule; consumers add it to `extends`.
// Plain JS: Node does not strip types under node_modules.

export default {
  // oxlint's defaults, plus import for import/no-duplicates.
  plugins: ["typescript", "unicorn", "oxc", "import"],
  jsPlugins: ["ts-lint"],
  rules: {
    "ts-lint/effect-fn-return-type": "error",
    "ts-lint/no-undefined": "error",
    "ts-lint/no-try-promise": "warn",
    "ts-lint/no-unknown": "warn",
    "ts-lint/no-ternary": "warn",
    "ts-lint/no-tag-compare": "error",
    "ts-lint/no-run-promise": "warn",
    "ts-lint/bun-serve-idle-timeout": "warn",
    "import/no-duplicates": "error",
    "max-depth": ["error", { max: 2 }],
  },
  overrides: [
    {
      // Each Promise library is wrapped once, in an adapter service; the rest of the code uses the service.
      files: ["**/adapters/**"],
      rules: { "ts-lint/no-try-promise": "off" },
    },
    {
      // Tests run the Effects they check, and their fake servers answer at once.
      files: ["**/test/**", "**/tests/**", "**/e2e/**", "**/*.test.ts", "**/*.test.tsx", "**/*.e2e.ts"],
      rules: { "ts-lint/no-run-promise": "off", "ts-lint/bun-serve-idle-timeout": "off" },
    },
  ],
}
