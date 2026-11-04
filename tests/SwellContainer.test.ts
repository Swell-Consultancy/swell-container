import { describe, it, expect, beforeEach } from 'vitest';
import { ClassA } from './stubs/ClassA';
import { ClassB } from './stubs/ClassB';
import { SwellContainer } from '../src/SwellContainer';

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
