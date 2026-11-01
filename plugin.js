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
  if (returned?.type !== "TSTypeReference") {
    return false;
  }
  const name = returned.typeName;
  return name.type === "TSQualifiedName" && name.left.type === "Identifier" && name.left.name === "Effect" && name.right.name === "Effect";
};
var isEffectMember = (node, names) => node.type === "MemberExpression" && node.object.type === "Identifier" && node.object.name === "Effect" && node.property.type === "Identifier" && names.includes(node.property.name);
var isCauseAnnotation = (node) => {
  const annotation = node.parent;
  if (annotation?.type !== "TSTypeAnnotation") {
    return false;
  }
  const owner = annotation.parent;
  if (owner?.type === "Identifier") {
    return owner.name === "cause";
  }
  const key = owner?.key;
  return key?.type === "Identifier" && key.name === "cause";
};
var GUARDED_TAGS = ["Some", "None", "Left", "Right", "Success", "Failure"];
var RUNNERS = ["runPromise", "runPromiseWith", "runPromiseExit", "runPromiseExitWith", "runSync", "runSyncWith", "runSyncExit", "runSyncExitWith", "runFork", "runForkWith", "runCallback", "runCallbackWith"];
var isTagRead = (node) => node.type === "MemberExpression" && node.property.type === "Identifier" && node.property.name === "_tag";
var isGuardedTag = (node) => node.type === "Literal" && GUARDED_TAGS.includes(node.value);
var plugin_default = {
  meta: { name: "ts-lint" },
  rules: {
    "no-unknown": {
      create: (context) => ({
        TSUnknownKeyword: (node) => {
          if (!isCauseAnnotation(node)) {
            context.report({ node, message: "Avoid `unknown`; use the real type, or `void` when nothing is returned." });
          }
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
    "no-try-promise": {
      create: (context) => ({
        MemberExpression: (node) => {
          const object = node.object;
          const property = node.property;
          if (object.type === "Identifier" && object.name === "Effect" && property.type === "Identifier" && property.name === "tryPromise") {
            context.report({ node, message: "Check that no Effect-native alternative exists; otherwise wrap the Promise library once in a service under `adapters/`." });
          }
        }
      })
    },
    "no-ternary": {
      create: (context) => ({
        ConditionalExpression: (node) => {
          context.report({ node, message: "Avoid the ternary; prefer an `if` with an early return." });
        }
      })
    },
    "no-tag-compare": {
      create: (context) => ({
        BinaryExpression: (node) => {
          if (!["===", "!==", "==", "!="].includes(node.operator)) {
            return;
          }
          const left = node.left;
          const right = node.right;
          if (isTagRead(left) && isGuardedTag(right) || isTagRead(right) && isGuardedTag(left)) {
            context.report({ node, message: "Use the data type's guard, e.g. `Option.isSome(x)` or `Exit.isSuccess(x)`, instead of comparing `_tag`." });
          }
        }
      })
    },
    "no-run-promise": {
      create: (context) => ({
        MemberExpression: (node) => {
          if (isEffectMember(node, RUNNERS)) {
            context.report({ node, message: "Keep the code in Effect and run it once at the entry point; compose with the caller's Effect instead of running it here." });
          }
        }
      })
    },
    "bun-serve-idle-timeout": {
      create: (context) => ({
        CallExpression: (node) => {
          const callee = node.callee;
          const isBunServe = callee.type === "MemberExpression" && callee.object.type === "Identifier" && callee.object.name === "Bun" && callee.property.name === "serve";
          const options = node.arguments[0];
          if (!isBunServe || options?.type !== "ObjectExpression") {
            return;
          }
          const keys = options.properties.map((property) => property.key?.name);
          if (!keys.includes("idleTimeout")) {
            context.report({ node, message: "Set `idleTimeout` on Bun.serve: by default Bun resets a request that sends nothing for 10 s, even while its handler runs." });
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
