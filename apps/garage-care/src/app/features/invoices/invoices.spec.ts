import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import {
  AuthApi,
  InvoicesApi,
  ServicesApi,
  CustomersApi,
  NotificationsApi,
  Invoice,
} from '@garage-care/shared/data-access';
import { Invoices } from './invoices';
describe('Invoice delivery', () => {
  const send = vi.fn();
  const customer = vi.fn();
  const invoice: Invoice = {
    _id: 'i1',
    serviceId: 's1',
    invoiceNumber: 'GC/2026-27/00001',
    status: 'finalized',
    pdfStatus: 'ready',
    snapshot: { totals: { grandTotalPaise: 10000 } },
  };
  beforeEach(() => {
    send.mockReset();
    customer
      .mockReset()
      .mockResolvedValue({
        _id: 'c1',
        name: 'Asha',
        phone: '+919876543210',
        whatsappConsent: { status: 'opted_in' },
      });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: AuthApi,
          useValue: { user: signal(null), garage: signal(null) },
        },
        {
          provide: InvoicesApi,
          useValue: {
            get: vi.fn().mockResolvedValue(invoice),
            sendWhatsApp: send,
          },
        },
        {
          provide: ServicesApi,
          useValue: { get: vi.fn().mockResolvedValue({ customerId: 'c1' }) },
        },
        { provide: CustomersApi, useValue: { get: customer } },
        { provide: NotificationsApi, useValue: { get: vi.fn() } },
      ],
    });
  });
  it('requires current customer consent before offering delivery', async () => {
    customer.mockResolvedValue({
      phone: '+919876543210',
      whatsappConsent: { status: 'unknown' },
    });
    const component = TestBed.createComponent(Invoices).componentInstance;
    await component.prepare(invoice);
    expect(component.delivery()).toBeNull();
    expect(send).not.toHaveBeenCalled();
    expect(component.notice()).toContain('consent');
  });
  it('reuses the same delivery key after an ambiguous failure and distinguishes queued from delivered', async () => {
    send
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ _id: 'n1', status: 'queued' });
    const component = TestBed.createComponent(Invoices).componentInstance;
    await component.prepare(invoice);
    expect(send).not.toHaveBeenCalled();
    await component.send();
    await component.send();
    expect(send.mock.calls[0][2]).toBe(send.mock.calls[1][2]);
    expect(component.deliveries().get('i1')?.status).toBe('queued');
    expect(component.notice()).toContain('does not confirm delivery');
  });
});
