import { Injectable, inject } from '@angular/core';
import { ApiClient } from './api-client';
import { Garage, GaragePatch } from './contracts';
@Injectable({ providedIn: 'root' })
export class GarageApi {
  private readonly api = inject(ApiClient);
  get(): Promise<Garage> {
    return this.api.read('/garage');
  }
  update(input: GaragePatch): Promise<Garage> {
    return this.api.write('PATCH', '/garage', input);
  }
}
