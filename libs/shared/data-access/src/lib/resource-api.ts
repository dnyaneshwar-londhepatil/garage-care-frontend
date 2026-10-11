import { inject } from '@angular/core';
import { ApiClient } from './api-client';
import { ListQuery, Page } from './contracts';

export abstract class ResourceApi<T, Input, Patch = Partial<Input>> {
  protected readonly api = inject(ApiClient);
  protected abstract readonly path: string;
  list(query: ListQuery = {}): Promise<Page<T>> {
    return this.api.list<T>(this.path, query);
  }
  get(id: string): Promise<T> {
    return this.api.read<T>(`${this.path}/${encodeURIComponent(id)}`);
  }
  create(input: Input): Promise<T> {
    return this.api.write<T>('POST', this.path, input);
  }
  update(id: string, input: Patch): Promise<T> {
    return this.api.write<T>(
      'PATCH',
      `${this.path}/${encodeURIComponent(id)}`,
      input,
    );
  }
}
