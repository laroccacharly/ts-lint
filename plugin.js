// plugin.ts
var isEffectFn = (node) => node?.type === "MemberExpression" && node.object.type === "Identifier" && node.object.name === "Effect" && node.property.type === "Identifier" && node.property.name === "fn";
var isEffectFnCall = (node) => {
  if (node?.type !== "CallExpression") {
    return false;
  }
  const callee = node.callee;
  return isEffectFn(callee) || callee.type === "CallExpression" && isEffectFn(callee.callee);
};
var returnsEffect = (annotation) => {
  if (annotation?.type !== "TSFunctionType") {
    return false;
  }
  const returned = annotation.returnType?.typeAnnotation;
  const name = returned?.type === "TSTypeReference" ? returned.typeName : undefined;
  return name?.type === "TSQualifiedName" && name.left.type === "Identifier" && name.left.name === "Effect" && name.right.name === "Effect";
};
var plugin_default = {
  meta: { name: "ts-lint" },
  rules: {
    "no-unknown": {
      create: (context) => ({
        TSUnknownKeyword: (node) => {
          context.report({ node, message: "Avoid `unknown`; use the real type, or `void` when nothing is returned." });
        }
      })
    },
    "no-undefined": {
      create: (context) => ({
        TSUndefinedKeyword: (node) => {
          context.report({ node, message: "Use `Option<A>` instead of `A | undefined`." });
        },
        Identifier: (node) => {
          if (node.name !== "undefined") {
            return;
          }
          const parent = node.parent;
          const comparison = parent.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(parent.operator);
          if (!comparison) {
            context.report({ node, message: "Use `Option.none()` instead of `undefined`." });
          }
        }
      })
    },
    "effect-fn-return-type": {
      create: (context) => ({
        VariableDeclarator: (node) => {
          if (!isEffectFnCall(node.init)) {
            return;
          }
          const annotation = node.id.typeAnnotation?.typeAnnotation;
          if (!returnsEffect(annotation)) {
            context.report({
              node,
              message: "Annotate this Effect.fn with its function type, e.g. `const f: (x: X) => Effect.Effect<A, E, R> = Effect.fn(...)`."
            });
          }
        }
      })
    }
  }
};
export {
  plugin_default as default
};
