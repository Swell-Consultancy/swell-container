import { ContainerError } from './ContainerError';

export class BindingNotFound extends ContainerError {

  public constructor (alias: string) {
    super(`Binding not found for alias: ${alias}`);
  }
}
