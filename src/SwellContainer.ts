import { BindingNotFound } from './errors/BindingNotFound';
import type { ContainerRegistry } from './contracts/ContainerRegistry';

export class SwellContainer<TRegistry extends ContainerRegistry> {
  private readonly registry: TRegistry;
  private readonly instances = new Map<keyof TRegistry, any>();

  private constructor (registry: TRegistry) {
    this.registry = registry;
  }

  public static init<const T extends ContainerRegistry> (
    registry: T
  ): SwellContainer<T> {
    return new SwellContainer(registry);
  }

  public resolve<K extends keyof TRegistry> (
    alias: K
  ): ReturnType<TRegistry[K]['factory']> {
    const config = this.registry[alias];

    if (!config) {
      throw new BindingNotFound(`${String(alias)}`);
    }

    const isTransient = config.scope === 'transient';

    if (!isTransient && this.instances.has(alias)) {
      return this.instances.get(alias);
    }

    const instance = config.factory();

    if (!isTransient) {
      this.instances.set(alias, instance);
    }

    return instance;
  }
}
