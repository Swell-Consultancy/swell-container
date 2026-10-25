# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@swell-enterprise/container` — a lightweight, decorator-free, strictly-typed DI container for TypeScript. It's the foundational DI layer of the Swell Enterprise Ecosystem (DDD/CQRS/Event Sourcing) and must stay framework-agnostic (Node, Deno, browser). Pre-1.0: breaking changes are acceptable.

## Commands

Package manager is pnpm (Node >= 22).

- `pnpm build` — bundle `src/index.ts` to ESM + CJS with `.d.mts`/`.d.cts` via tsdown into `dist/`
- `pnpm dev` — build in watch mode
- `pnpm test` — run vitest once
- `pnpm vitest run tests/SwellContainer.test.ts -t "transient"` — single file / single test by name
- `pnpm typecheck` — `tsc --noEmit` (note: `tsconfig.json` only includes `src/`, so tests aren't typechecked by this)
- `prepublishOnly` runs build, `publint`, and `attw --pack` — run these when changing `package.json` exports or build output.

No linter is configured.

## Architecture

The type safety comes from the registry literal, not from runtime checks:

- `SwellContainer.init<const T>(registry)` captures the registry as a `const` type parameter, so `resolve(alias)` only accepts registered keys and returns `ReturnType<T[K]['factory']>`. Preserve this inference when changing the API — tests rely on `resolve()` returning the concrete class type (e.g. calling `instance.getName()` without casts).
- A registry is `Record<string, BindingConfig<any>>` (`src/contracts/`); each binding is a `factory` plus optional `scope` (`'singleton' | 'transient'`, `src/Scope.ts`). Omitted scope means singleton.
- Singletons are cached lazily per container instance on first `resolve`; transients call the factory every time.
- Errors extend the abstract `ContainerError` (`src/errors/`), which sets `name` from the subclass constructor. Unknown aliases throw `BindingNotFound`.
- `src/index.ts` is the public API surface; anything new that consumers need must be exported there (types via `export type`).

Tests live in `tests/` with stub classes/contracts in `tests/stubs/`.
