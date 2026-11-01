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
  if (returned?.type !== "TSTypeReference") {
    return false
  }
  const name = returned.typeName as Node
  return (
    name.type === "TSQualifiedName" &&
    (name.left as Node).type === "Identifier" &&
    (name.left as Node).name === "Effect" &&
    (name.right as Node).name === "Effect"
  )
}

// `Effect.<name>` for one of `names`.
const isEffectMember = (node: Node, names: readonly string[]): boolean =>
  node.type === "MemberExpression" &&
  (node.object as Node).type === "Identifier" &&
  (node.object as Node).name === "Effect" &&
  (node.property as Node).type === "Identifier" &&
  names.includes((node.property as Node).name as string)

// Tags of the data types that come with guards: `Option.isSome`, `Either.isLeft`, `Exit.isSuccess`, ...
const GUARDED_TAGS = ["Some", "None", "Left", "Right", "Success", "Failure"]

const RUNNERS = ["runPromise", "runPromiseWith", "runPromiseExit", "runPromiseExitWith", "runSync", "runSyncWith", "runSyncExit", "runSyncExitWith", "runFork", "runForkWith", "runCallback", "runCallbackWith"]

const isTagRead = (node: Node): boolean =>
  node.type === "MemberExpression" && (node.property as Node).type === "Identifier" && (node.property as Node).name === "_tag"

const isGuardedTag = (node: Node): boolean => node.type === "Literal" && GUARDED_TAGS.includes(node.value as string)

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
    // Effect.tryPromise wraps a Promise-based API; an Effect-native one (HttpClient, FileSystem, ...) often exists already.
    // Otherwise the library is wrapped once in a service under `adapters/`, where the shared config turns this rule off.
    "no-try-promise": {
      create: (context: Context) => ({
        MemberExpression: (node: Node) => {
          const object = node.object as Node
          const property = node.property as Node
          if (object.type === "Identifier" && object.name === "Effect" && property.type === "Identifier" && property.name === "tryPromise") {
            context.report({ node, message: "Check that no Effect-native alternative exists; otherwise wrap the Promise library once in a service under `adapters/`." })
          }
        },
      }),
    },
    // `a ? b : c` hides branching inside an expression; an `if` with an early return keeps each branch on its own lines.
    "no-ternary": {
      create: (context: Context) => ({
        ConditionalExpression: (node: object) => {
          context.report({ node, message: "Avoid the ternary; prefer an `if` with an early return." })
        },
      }),
    },
    // `x._tag === "Some"` restates what `Option.isSome(x)` (or `Either.isLeft`, `Exit.isSuccess`, ...) says,
    // and the guard narrows the type without depending on the tag's spelling.
    "no-tag-compare": {
      create: (context: Context) => ({
        BinaryExpression: (node: Node) => {
          if (!["===", "!==", "==", "!="].includes(node.operator as string)) {
            return
          }
          const left = node.left as Node
          const right = node.right as Node
          if ((isTagRead(left) && isGuardedTag(right)) || (isTagRead(right) && isGuardedTag(left))) {
            context.report({ node, message: "Use the data type's guard, e.g. `Option.isSome(x)` or `Exit.isSuccess(x)`, instead of comparing `_tag`." })
          }
        },
      }),
    },
    // Running an Effect inside the program splits it in two runtimes: errors become rejected Promises, and
    // interruption, services and tracing stop at the boundary. Run Effects once, at the entry point (BunRuntime.runMain);
    // the shared config allows it in tests.
    "no-run-promise": {
      create: (context: Context) => ({
        MemberExpression: (node: Node) => {
          if (isEffectMember(node, RUNNERS)) {
            context.report({ node, message: "Keep the code in Effect and run it once at the entry point; compose with the caller's Effect instead of running it here." })
          }
        },
      }),
    },
    // Bun closes an HTTP request that has sent nothing for 10 seconds, including one whose handler is still working,
    // so a slow upstream call fails in the client with a reset rather than the handler's own timeout or error.
    "bun-serve-idle-timeout": {
      create: (context: Context) => ({
        CallExpression: (node: Node) => {
          const callee = node.callee as Node
          const isBunServe =
            callee.type === "MemberExpression" &&
            (callee.object as Node).type === "Identifier" &&
            (callee.object as Node).name === "Bun" &&
            (callee.property as Node).name === "serve"
          const options = (node.arguments as readonly Node[])[0]
          if (!isBunServe || options?.type !== "ObjectExpression") {
            return
          }
          const keys = (options.properties as readonly Node[]).map((property) => (property.key as Node | undefined)?.name)
          if (!keys.includes("idleTimeout")) {
            context.report({ node, message: "Set `idleTimeout` on Bun.serve: by default Bun resets a request that sends nothing for 10 s, even while its handler runs." })
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
