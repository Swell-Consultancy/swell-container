# Swell Container

[![npm version](https://badge.fury.io/js/@swell-enterprise%2Fcontainer.svg)](https://badge.fury.io/js/@swell-enterprise%2Fcontainer)
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
pnpm i @swell-enterprise/container
```

## Usage

Initialize the container and register your dependencies somewhere in your application startup code:

```typescript
import { SwellContainer } from '@swell-enterprise/container';

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
import { SwellContainer } from '@swell-enterprise/container';

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

## Enterprise Support

Scale your business with expert support from [Keith Mifsud](https://keith-mifsud.me/collaborate/) and
the [Swell Consultancy team](https://swell-consultancy.com). We become your partner in building systems that run your
business. 

