// oxlint JS plugin with rules for Effect TypeScript code.

interface Node {
  readonly type: string
  readonly [key: string]: Node | readonly Node[] | string | boolean | number | null | undefined
}

interface Context {
  report: (descriptor: { node: object; message: string }) => void
}

const isEffectFn = (node: Node | undefined): boolean =>
  node?.type === "MemberExpression" &&
  (node.object as Node).type === "Identifier" &&
  (node.object as Node).name === "Effect" &&
  (node.property as Node).type === "Identifier" &&
  (node.property as Node).name === "fn"

// `Effect.fn("name")(function* ...)` or `Effect.fn(function* ...)`.
const isEffectFnCall = (node: Node | null | undefined): boolean => {
  if (node?.type !== "CallExpression") {
    return false
  }
  const callee = node.callee as Node
  return isEffectFn(callee) || (callee.type === "CallExpression" && isEffectFn(callee.callee as Node))
}

// `(...) => Effect.Effect<...>`
const returnsEffect = (annotation: Node | undefined): boolean => {
  if (annotation?.type !== "TSFunctionType") {
    return false
  }
  const returned = (annotation.returnType as Node | undefined)?.typeAnnotation as Node | undefined
  const name = returned?.type === "TSTypeReference" ? (returned.typeName as Node) : undefined
  return (
    name?.type === "TSQualifiedName" &&
    (name.left as Node).type === "Identifier" &&
    (name.left as Node).name === "Effect" &&
    (name.right as Node).name === "Effect"
  )
}

export default {
  meta: { name: "ts-lint" },
  rules: {
    // `unknown` in a type erases what callers can use, e.g. a service method declared `Effect<unknown>`
    // while its implementation returns a value. Prefer the real type, or `void` when nothing is returned.
    "no-unknown": {
      create: (context: Context) => ({
        TSUnknownKeyword: (node: object) => {
          context.report({ node, message: "Avoid `unknown`; use the real type, or `void` when nothing is returned." })
        },
      }),
    },
    // Absence is an Option, not `undefined`: no `| undefined` types and no `undefined` values.
    // Comparing with `undefined` stays allowed, to read optional fields and non-Effect APIs at the boundary.
    "no-undefined": {
      create: (context: Context) => ({
        TSUndefinedKeyword: (node: object) => {
          context.report({ node, message: "Use `Option<A>` instead of `A | undefined`." })
        },
        Identifier: (node: Node) => {
          if (node.name !== "undefined") {
            return
          }
          const parent = node.parent as Node
          const comparison = parent.type === "BinaryExpression" && ["===", "!==", "==", "!="].includes(parent.operator as string)
          if (!comparison) {
            context.report({ node, message: "Use `Option.none()` instead of `undefined`." })
          }
        },
      }),
    },
    // A named Effect.fn states what it succeeds with, how it fails and what it needs, so a change to any of them
    // is a type error at the definition rather than a surprise at the call site. Omitted E and R default to never.
    "effect-fn-return-type": {
      create: (context: Context) => ({
        VariableDeclarator: (node: Node) => {
          if (!isEffectFnCall(node.init as Node | null)) {
            return
          }
          const annotation = ((node.id as Node).typeAnnotation as Node | undefined)?.typeAnnotation as Node | undefined
          if (!returnsEffect(annotation)) {
            context.report({
              node,
              message: "Annotate this Effect.fn with its function type, e.g. `const f: (x: X) => Effect.Effect<A, E, R> = Effect.fn(...)`.",
            })
          }
        },
      }),
    },
  },
}
