import { BindingConfig } from './BindingConfig';

export type ContainerRegistry = Record<string,
  | (BindingConfig<unknown> & { contextual?: Record<string, BindingConfig<unknown>> })
  | { contextual: Record<string, BindingConfig<unknown>> }
>;
