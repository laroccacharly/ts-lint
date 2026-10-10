// oxlint config enabling every ts-lint rule; consumers add it to `extends`.
// Plain JS: Node does not strip types under node_modules.

export default {
  jsPlugins: ["ts-lint"],
  rules: {
    "ts-lint/effect-fn-return-type": "error",
    "ts-lint/no-undefined": "error",
    "ts-lint/no-try-promise": "warn",
    "ts-lint/no-unknown": "warn",
  },
  overrides: [
    {
      // Each Promise library is wrapped once, in an adapter service; the rest of the code uses the service.
      files: ["**/adapters/**"],
      rules: { "ts-lint/no-try-promise": "off" },
    },
  ],
}
