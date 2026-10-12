export interface ApiResponse<T> {
  data: T;
}
export interface Page<T> extends ApiResponse<T[]> {
  page: { limit: number; nextCursor: string | null };
}
export interface ListQuery {
  limit?: number;
  cursor?: string;
  q?: string;
  status?: string;
  customerId?: string;
  vehicleId?: string;
}
export interface Resource {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Owner {
  id: string;
  email: string;
  fullName?: string | null;
}
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: 'IN';
}
export interface Garage extends Resource {
  name: string;
  phone: string;
  address?: Address;
  gst?: {
    registrationMode?: 'regular' | 'composition' | 'unregistered';
    verificationStatus: string;
  };
}
export interface GaragePatch {
  name?: string;
  phone?: string;
  address?: Address;
}
export interface RegistrationInput {
  owner: { email: string; password: string; fullName?: string };
  garage: {
    name: string;
    phone: string;
    address?: Address;
    registrationMode?: 'regular' | 'composition' | 'unregistered';
    gstin?: string;
  };
}
export interface SessionData {
  user: Owner;
  garage: Garage;
  csrfToken?: string;
}
export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  whatsappConsent?: {
    status: 'unknown' | 'opted_in' | 'opted_out';
    source: string;
  };
}
export interface Customer extends Resource, CustomerInput {}
export interface VehicleInput {
  customerId: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'other';
  registrationNumber: string;
  brand: string;
  model: string;
  fuelType?: string;
  currentKm?: number;
}
export interface Vehicle extends Resource, VehicleInput {}
export interface PartInput {
  name: string;
  category: string;
  brand?: string;
  partNumber?: string;
  mrpPaise: number;
}
export interface Part extends Resource, PartInput {}
export interface ServiceLine {
  kind: 'part' | 'labour';
  partId?: string;
  description: string;
  quantity: number;
  mrpPaise: number;
  discountPerUnitPaise?: number;
  taxCategory?: 'non_gst';
}
export interface ServiceInput {
  customerId: string;
  vehicleId: string;
  serviceDate: string;
  odometerKm?: number;
  complaint?: string;
  workPerformed?: string;
  items?: ServiceLine[];
  nextServiceDueDate?: string;
}
export type ServiceStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export interface ServiceJob extends Resource, ServiceInput {
  serviceNumber?: string;
  status: ServiceStatus;
  version: number;
}
export type ServicePatch = Partial<
  Omit<ServiceInput, 'customerId' | 'vehicleId'>
> & { version: number; status?: 'draft' | 'in_progress' | 'cancelled' };
export interface Invoice extends Resource {
  serviceId: string;
  invoiceNumber: string;
  status: string;
  finalizedAt?: string;
  snapshot: { totals: { grandTotalPaise: number }; [key: string]: unknown };
  pdfStatus: 'pending' | 'processing' | 'ready' | 'failed';
}
export interface ReminderInput {
  customerId: string;
  vehicleId: string;
  dueDate: string;
}
export interface Reminder extends Resource, ReminderInput {
  scheduledAt: string;
  status: string;
  attempts?: number;
}
export interface Notification extends Resource {
  status:
    | 'queued'
    | 'processing'
    | 'submitted'
    | 'sent'
    | 'delivered'
    | 'read'
    | 'failed'
    | 'unknown';
  invoiceId?: string;
  reminderId?: string;
}
export interface DashboardSummary {
  serviceCounts: {
    draft: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  customers: number;
  upcomingReminders: number;
  recentInvoices: Invoice[];
  revenueSummary: { issuedInvoiceTotalPaise: number; paidTotalPaise: null };
}
