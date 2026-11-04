import { BindingNotFound } from './errors/BindingNotFound';
import type { ContainerRegistry } from './contracts/ContainerRegistry';
import type { BindingConfig } from './contracts/BindingConfig';

type BindingInstance<T> = T extends BindingConfig<infer TInstance> ? TInstance : never;
type DefaultAlias<T> = {
  [K in keyof T]: Extract<T[K], BindingConfig<unknown>> extends never ? never : K;
}[keyof T];
type ContextualBindings<T> = T extends { contextual?: infer TBindings } ? NonNullable<TBindings> : {};

export class SwellContainer<TRegistry extends ContainerRegistry> {
  private readonly registry: TRegistry;
  private readonly instances = new Map<keyof TRegistry, Map<string | undefined, unknown>>();

  private constructor (registry: TRegistry) {
    this.registry = registry;
  }

  public static init<const T extends ContainerRegistry> (
    registry: T
  ): SwellContainer<T> {
    return new SwellContainer(registry);
  }

  public resolve<K extends DefaultAlias<TRegistry>> (
    alias: K
  ): BindingInstance<TRegistry[K]>;
  public resolve<K extends keyof TRegistry, C extends keyof ContextualBindings<TRegistry[K]> & string> (
    alias: K,
    options: { context: C }
  ): BindingInstance<ContextualBindings<TRegistry[K]>[C]>;
  public resolve (
    alias: keyof TRegistry,
    options?: { context: string }
  ): unknown {
    const entry = Object.prototype.hasOwnProperty.call(this.registry, alias) ? this.registry[alias] : undefined;
    const context = options?.context;
    let config: BindingConfig<unknown> | undefined;

    if (context === undefined) {
      config = entry && 'factory' in entry ? entry : undefined;
    } else if (entry && 'contextual' in entry && entry.contextual
      && Object.prototype.hasOwnProperty.call(entry.contextual, context)) {
      config = entry.contextual[context];
    }

    if (!config) {
      throw new BindingNotFound(String(alias), context);
    }

    const isTransient = config.scope === 'transient';

    const instances = this.instances.get(alias);

    if (!isTransient && instances?.has(context)) {
      return instances.get(context);
    }

    const instance = config.factory();

    if (!isTransient) {
      const cache = instances ?? new Map<string | undefined, unknown>();
      cache.set(context, instance);
      this.instances.set(alias, cache);
    }

    return instance;
  }
}
