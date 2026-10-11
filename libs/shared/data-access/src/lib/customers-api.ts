import { Injectable } from '@angular/core';
import { Customer, CustomerInput } from './contracts';
import { ResourceApi } from './resource-api';
@Injectable({ providedIn: 'root' })
export class CustomersApi extends ResourceApi<Customer, CustomerInput> {
  protected readonly path = '/customers';
}
