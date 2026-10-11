export interface Job {
  id: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  vehicleDescription?: string;
  registration: string;
  vehicles: number;
  status: 'In Progress' | 'Completed' | 'Draft';
  service: string;
}
