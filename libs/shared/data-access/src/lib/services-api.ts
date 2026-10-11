import { Injectable } from '@angular/core';
import {
  Invoice,
  ListQuery,
  ServiceInput,
  ServiceJob,
  ServicePatch,
} from './contracts';
import { ResourceApi } from './resource-api';
@Injectable({ providedIn: 'root' })
export class ServicesApi extends ResourceApi<
  ServiceJob,
  ServiceInput,
  ServicePatch
> {
  protected readonly path = '/services';
  history(id: string, query: ListQuery = {}) {
    return this.api.list<ServiceJob>(
      `${this.path}/${encodeURIComponent(id)}/history`,
      query,
    );
  }
  complete(id: string, idempotencyKey: string): Promise<Invoice> {
    return this.api.write(
      'POST',
      `${this.path}/${encodeURIComponent(id)}/complete`,
      {},
      idempotencyKey,
    );
  }
}
