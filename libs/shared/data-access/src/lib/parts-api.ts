import { Injectable } from '@angular/core';
import { Part, PartInput } from './contracts';
import { ResourceApi } from './resource-api';
@Injectable({ providedIn: 'root' })
export class PartsApi extends ResourceApi<Part, PartInput> {
  protected readonly path = '/parts';
}
