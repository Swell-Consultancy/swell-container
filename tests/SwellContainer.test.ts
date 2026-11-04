import { describe, it, expect, beforeEach } from 'vitest';
import { ClassA } from './stubs/ClassA';
import { ClassB } from './stubs/ClassB';
import { SwellContainer } from '../src/SwellContainer';
import { BindingNotFound } from '../src/errors/BindingNotFound';

describe('SwellContainer - Scope Management', () => {
  const registry = {
    // Default scope (implicit singleton)
    'Stubs.DefaultSingleton': {
      factory: () => new ClassA('Default Singleton'),
    },
    // Explicit singleton scope
    'Stubs.ExplicitSingleton': {
      scope: 'singleton',
      factory: () => new ClassA('Explicit Singleton'),
    },
    // Transient scope
    'Stubs.Transient': {
      scope: 'transient',
      factory: () => new ClassB('Transient'),
    },
  } as const;

  let container: SwellContainer<typeof registry>;

  beforeEach(() => {
    container = SwellContainer.init(registry);
  });

  it('should resolve the registered class instance', () => {
    const instance = container.resolve('Stubs.DefaultSingleton');

    expect(instance).toBeInstanceOf(ClassA);
    expect(instance.getName()).toBe('Default Singleton');
  });

  it('should return the same instance for implicit singletons', () => {
    const instance1 = container.resolve('Stubs.DefaultSingleton');
    const instance2 = container.resolve('Stubs.DefaultSingleton');

    expect(instance1).toBe(instance2);
  });

  it('should return the same instance for explicit singleton bindings', () => {
    const instance1 = container.resolve('Stubs.ExplicitSingleton');
    const instance2 = container.resolve('Stubs.ExplicitSingleton');

    expect(instance1).toBe(instance2);
  });

  it('should return distinct instances for transient bindings', () => {
    const instance1 = container.resolve('Stubs.Transient');
    const instance2 = container.resolve('Stubs.Transient');

    // Reference inequality check
    expect(instance1).not.toBe(instance2);
  });

  it('should ensure state changes on one transient instance do not mutate another', () => {
    const instance1 = container.resolve('Stubs.Transient');
    const instance2 = container.resolve('Stubs.Transient');

    // Assuming ClassB has a setter/property
    instance1.setName('Modified Name');

    expect(instance1.getName()).toBe('Modified Name');
    expect(instance2.getName()).toBe('Transient');
  });
});

enum Context {
  Singleton = 'singleton',
  Transient = 'transient',
}

describe('SwellContainer - Contextual Bindings', () => {
  const registry = {
    service: {
      factory: () => new ClassA('Default'),
      contextual: {
        first: { factory: () => new ClassA('First') },
        second: { factory: () => new ClassB('Second'), scope: 'singleton' },
        [Context.Transient]: { factory: () => new ClassB('Transient'), scope: 'transient' },
        '': { factory: () => new ClassA('Empty context') },
      },
    },
    contextualOnly: {
      contextual: {
        [Context.Singleton]: { factory: () => new ClassB('Context only') },
      },
    },
    ordinary: { factory: () => new ClassA('Ordinary') },
  } as const;

  let container: SwellContainer<typeof registry>;

  beforeEach(() => {
    container = SwellContainer.init(registry);
  });

  it('resolves string and string enum contexts using their own factories', () => {
    expect(container.resolve('service', { context: 'first' }).getName()).toBe('First');
    expect(container.resolve('service', { context: 'second' })).toBeInstanceOf(ClassB);
    expect(container.resolve('contextualOnly', { context: Context.Singleton }).getName()).toBe('Context only');
    expect(container.resolve('service', { context: '' }).getName()).toBe('Empty context');
  });

  it('caches implicit and explicit singletons separately from each other and the default', () => {
    const first = container.resolve('service', { context: 'first' });
    const second = container.resolve('service', { context: 'second' });
    const defaultInstance = container.resolve('service');

    expect(container.resolve('service', { context: 'first' })).toBe(first);
    expect(container.resolve('service', { context: 'second' })).toBe(second);
    expect(container.resolve('service')).toBe(defaultInstance);
    expect(first).not.toBe(second);
    expect(first).not.toBe(defaultInstance);
    expect(second).not.toBe(defaultInstance);
  });

  it('keeps singleton caches separate per alias and container', () => {
    const binding = { contextual: { shared: { factory: () => ({}) } } };
    const first = SwellContainer.init({ a: binding, b: binding });
    const second = SwellContainer.init({ a: binding });

    expect(first.resolve('a', { context: 'shared' })).not.toBe(first.resolve('b', { context: 'shared' }));
    expect(first.resolve('a', { context: 'shared' })).not.toBe(second.resolve('a', { context: 'shared' }));
  });

  it('creates a new instance for each transient contextual resolution', () => {
    const first = container.resolve('service', { context: Context.Transient });
    const second = container.resolve('service', { context: Context.Transient });
    first.setName('Changed');

    expect(first).not.toBe(second);
    expect(second.getName()).toBe('Transient');
  });

  it('uses each contextual scope independently of the default scope', () => {
    const container = SwellContainer.init({
      service: {
        factory: () => ({}), scope: 'transient',
        contextual: { singleton: { factory: () => ({}) } },
      },
    });

    expect(container.resolve('service')).not.toBe(container.resolve('service'));
    expect(container.resolve('service', { context: 'singleton' }))
      .toBe(container.resolve('service', { context: 'singleton' }));
  });

  it('caches undefined singleton values', () => {
    let calls = 0;
    const container = SwellContainer.init({
      service: { contextual: { empty: { factory: () => { calls++; } } } },
    });

    expect(container.resolve('service', { context: 'empty' })).toBeUndefined();
    expect(container.resolve('service', { context: 'empty' })).toBeUndefined();
    expect(calls).toBe(1);
  });

  it('throws for missing contexts without falling back to the default factory', () => {
    // @ts-expect-error Context keys are restricted to the registered contexts.
    expect(() => container.resolve('service', { context: 'missing' }))
      .toThrow('Binding not found for alias: service in context: missing');
    // @ts-expect-error Ordinary bindings do not have contexts.
    expect(() => container.resolve('ordinary', { context: 'first' })).toThrow(BindingNotFound);
    // @ts-expect-error Context-only bindings require a context.
    expect(() => container.resolve('contextualOnly')).toThrow(BindingNotFound);
  });

  it('rejects missing aliases and inherited object properties', () => {
    // @ts-expect-error Unknown aliases are rejected statically and at runtime.
    expect(() => container.resolve('missing')).toThrow(BindingNotFound);
    // @ts-expect-error Inherited properties are not registered aliases.
    expect(() => container.resolve('toString')).toThrow(BindingNotFound);
    // @ts-expect-error Inherited properties are not registered contexts.
    expect(() => container.resolve('service', { context: 'toString' })).toThrow(BindingNotFound);
  });

  it('allows contextual factories to resolve existing dependencies', () => {
    const container = SwellContainer.init({
      dependency: { factory: () => new ClassA('Dependency') },
      service: { contextual: { dependent: { factory: (): string => container.resolve('dependency').getName() } } },
    });

    expect(container.resolve('service', { context: 'dependent' })).toBe('Dependency');
  });
});
