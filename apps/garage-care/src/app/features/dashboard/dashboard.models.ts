export interface Job {
  id: string;
  number?: string;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  vehicleDescription?: string;
  registration: string;
  vehicles: number;
  status: 'In Progress' | 'Completed' | 'Draft' | 'Cancelled';
  service: string;
  invoiceId?: string;
  version?: number;
  whatsappConsent?: boolean;
}
