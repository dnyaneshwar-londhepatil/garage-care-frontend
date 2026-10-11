import { Injectable } from '@angular/core';
import { Vehicle, VehicleInput } from './contracts';
import { ResourceApi } from './resource-api';
@Injectable({ providedIn: 'root' })
export class VehiclesApi extends ResourceApi<
  Vehicle,
  VehicleInput,
  Partial<Omit<VehicleInput, 'customerId'>>
> {
  protected readonly path = '/vehicles';
}
