// oxlint config enabling every ts-lint rule; consumers add it to `extends`.
// Plain JS: Node does not strip types under node_modules.

export default {
  jsPlugins: ["ts-lint"],
  rules: {
    "ts-lint/effect-fn-return-type": "error",
    "ts-lint/no-undefined": "error",
    "ts-lint/no-unknown": "warn",
  },
}
