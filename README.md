# Swell Container

[![npm version](https://badge.fury.io/js/@swell-consultancy%2Fcontainer.svg)](https://badge.fury.io/js/@swell-consultancy%2Fcontainer)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

> ⚠ This package is in **active development** and should not be used in production yet. Expect breaking changes until
> v1.0.0.

Swell Container is a lightweight, decorator-free, strictly-typed Object-Oriented Dependency Injection container for
TypeScript.

This package is the foundational DI layer of the **Swell Enterprise Ecosystem**, designed to help teams implement robust
Domain-Driven Design (DDD), CQRS and Event Sourcing patterns in TypeScript with minimal framework lock-in.

The Swell Container is framework-agnostic and can be used in any TypeScript project, including Node.js, Deno, and
browser environments. It provides a simple and intuitive API for managing dependencies, promoting code reusability, and
improving testability.

---

## Installation

```bash
pnpm i @swell-consultancy/container
```

## Usage

Initialize the container and register your dependencies somewhere in your application startup code:

```typescript
import { SwellContainer } from '@swell-consultancy/container';

const registry = {
  // Default scope (implicit singleton)
  'Desired.Namespace.DefaultSingleton': {
    factory: () => new ClassA('Default Singleton'),
  },
  // Explicit singleton scope
  'AnotherDesired.Namespace.ExplicitSingleton': {
    scope: 'singleton',
    factory: () => new ClassA('Explicit Singleton'),
  },
  // Transient scope
  'YetAnotherDesired.Namespace.Transient': {
    scope: 'transient',
    factory: () => new ClassB('Transient'),
  },
} as const;

const container = SwellContainer.init(registry);
```

By default, the container uses a singleton scope for all dependencies. When you need a new instance of a dependency each
time it is requested, you can specify the `transient` scope.

You can retrieve instances of your dependencies using the `resolve` method:

```typescript
const defaultSingleton = container.resolve('Desired.Namespace.DefaultSingleton');
const explicitSingleton = container.resolve('AnotherDesired.Namespace.ExplicitSingleton');
const transient = container.resolve('YetAnotherDesired.Namespace.Transient');
```

## Use Swell Container for Dependency Injection in Nuxt

In Nuxt, you can initialize the Swell Container in a Util:

```typescript
// utils/container.ts
import { SwellContainer } from '@swell-consultancy/container';

const registry = {
  'Desired.Namespace.DefaultSingleton': {
    factory: () => new ClassA('Default Singleton'),
  },
  'AnotherDesired.Namespace.ExplicitSingleton': {
    scope: 'singleton',
    factory: () => new ClassA('Explicit Singleton'),
  },
  'YetAnotherDesired.Namespace.Transient': {
    scope: 'transient',
    factory: () => new ClassB('Transient'),
  },
};

export const container = SwellContainer.init(registry);
```

## Contributing

Please open an issue on GitHub if you encounter any problems or have questions about using the Swell Container. We
welcome contributions and feedback from the community to help improve the package.

## CI and releases

PRs into `develop` and `main` run tests, typecheck, build, publint and attw.
Merged PRs into `main` publish to npm using `.github/workflows/release.yml`.
The next version comes from npm's `latest` version: no release label means patch,
`release:minor` means minor, and `release:major` means major. Conflicting release
labels fail CI and release. For the first release, label the PR `release:minor`
to advance `0.0.12` to `0.1.0`.

Before the first release, configure a GitHub Actions **Trusted Publisher** in the
[npm package settings](https://www.npmjs.com/package/@swell-consultancy/container/access):
organization `Swell-Consultancy`, repository `swell-container`, workflow filename
`release.yml`, and no environment. No npm token or GitHub Actions npm secret is
needed. See [npm's Trusted Publishing documentation](https://docs.npmjs.com/trusted-publishers/).
Allow the workflow's `GITHUB_TOKEN` to create tags and GitHub Releases under any
repository tag rules. Configure the `CI / checks` job as required in branch protection.

Releases queue without cancelling earlier merges. Rerun a failed release to
recover missing tags or GitHub Releases; npm's published `gitHead` prevents
publishing another version of the same merge. The version changes only in the
runner's working copy, and `vX.Y.Z` tags point to the merged commit. The workflow
never pushes a version commit to `main`, so the checked-in version can lag npm.

## Enterprise Support

Scale your business with expert support from [Keith Mifsud](https://keith-mifsud.me/collaborate/) and
the [Swell Consultancy team](https://swell-consultancy.com). We become your partner in building systems that run your
business. 

