import { ContainerError } from './ContainerError';

export class BindingNotFound extends ContainerError {

  public constructor (alias: string, context?: string) {
    super(`Binding not found for alias: ${alias}${context === undefined ? '' : ` in context: ${context}`}`);
  }
}
