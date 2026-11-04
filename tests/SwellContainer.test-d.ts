import { expectTypeOf } from 'vitest';
import { SwellContainer, type BindingConfig, type ContainerRegistry } from '../src';

enum Context {
  Number = 'number',
}

const container = SwellContainer.init({
  service: {
    factory: () => true,
    contextual: {
      text: { factory: () => 'value' },
      [Context.Number]: { factory: () => 42, scope: 'transient' },
    },
  },
  contextualOnly: { contextual: { object: { factory: () => ({ name: 'value' }) } } },
  ordinary: { factory: () => new Date() },
});

expectTypeOf(container.resolve('service')).toEqualTypeOf<boolean>();
expectTypeOf(container.resolve('service', { context: 'text' })).toEqualTypeOf<string>();
expectTypeOf(container.resolve('service', { context: Context.Number })).toEqualTypeOf<number>();
expectTypeOf(container.resolve('contextualOnly', { context: 'object' })).toEqualTypeOf<{ name: string }>();
expectTypeOf(container.resolve('ordinary')).toEqualTypeOf<Date>();

const ordinaryRegistry: Record<string, BindingConfig<Date>> = { date: { factory: () => new Date() } };
expectTypeOf(SwellContainer.init(ordinaryRegistry).resolve('date')).toEqualTypeOf<Date>();
const annotatedRegistry: ContainerRegistry = { date: { factory: () => new Date() } };
// @ts-expect-error Broad registry types do not guarantee a default factory.
SwellContainer.init(annotatedRegistry).resolve('date');
const checkedRegistry = { date: { factory: () => new Date() } } satisfies ContainerRegistry;
expectTypeOf(SwellContainer.init(checkedRegistry).resolve('date')).toEqualTypeOf<Date>();

declare const unionRegistry: {
  service: BindingConfig<number> | { contextual: { text: BindingConfig<string> } };
};
// @ts-expect-error A union binding may not provide a default factory.
SwellContainer.init(unionRegistry).resolve('service');

const context: 'text' | Context.Number = Math.random() > 0.5 ? 'text' : Context.Number;
expectTypeOf(container.resolve('service', { context })).toEqualTypeOf<string | number>();

// @ts-expect-error Unknown context.
container.resolve('service', { context: 'missing' });
// @ts-expect-error Contexts are specific to their alias.
container.resolve('service', { context: 'object' });
// @ts-expect-error Context-only bindings require options.
container.resolve('contextualOnly');
// @ts-expect-error Ordinary bindings have no contexts.
container.resolve('ordinary', { context: 'text' });
// @ts-expect-error Context must be a string key.
container.resolve('service', { context: 42 });
// @ts-expect-error Unknown alias.
container.resolve('missing', { context: 'text' });
// @ts-expect-error Contextual scopes use the existing scope type.
SwellContainer.init({ service: { contextual: { invalid: { factory: () => 1, scope: 'request' } } } });
// @ts-expect-error Every contextual binding requires a factory.
SwellContainer.init({ service: { contextual: { invalid: { scope: 'singleton' } } } });
