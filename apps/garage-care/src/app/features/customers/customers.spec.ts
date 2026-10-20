import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthApi, CustomersApi } from '@garage-care/shared/data-access';
import { Customers } from './customers';

describe('Customers', () => {
  const list = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const get = vi.fn();
  let data: { preview?: boolean };
  beforeEach(() => {
    data = {};
    list
      .mockReset()
      .mockResolvedValue({ data: [], page: { nextCursor: null } });
    create
      .mockReset()
      .mockResolvedValue({
        _id: 'c1',
        name: 'Asha Patil',
        phone: '+919876543210',
      });
    update.mockReset();
    get.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
        {
          provide: AuthApi,
          useValue: { user: signal(null), garage: signal(null) },
        },
        { provide: CustomersApi, useValue: { list, create, update, get } },
      ],
    });
  });
  it('searches the server and loads the next cursor without duplicate records', async () => {
    const component = TestBed.createComponent(Customers).componentInstance;
    component.search.setValue(' Asha ');
    list.mockResolvedValue({
      data: [{ _id: 'c1', name: 'Asha', phone: '+919876543210' }],
      page: { nextCursor: 'c1' },
    });
    await component.load();
    await component.load(true);
    expect(list).toHaveBeenLastCalledWith({
      limit: 20,
      q: 'Asha',
      cursor: 'c1',
    });
    expect(component.records()).toHaveLength(1);
  });
  it('sends required customer fields with an Indian mobile number and no fabricated consent', async () => {
    const component = TestBed.createComponent(Customers).componentInstance;
    await component.open();
    component.form.patchValue({ name: ' Asha Patil ', phone: '9876543210' });
    await component.save();
    expect(create).toHaveBeenCalledWith({
      name: 'Asha Patil',
      phone: '+919876543210',
      address: '',
      notes: '',
    });
    expect(component.notice()).toBe('Customer saved.');
    expect(component.editorOpen()).toBe(false);
  });
  it('validates the mobile number without submitting an invalid record', async () => {
    const component = TestBed.createComponent(Customers).componentInstance;
    await component.open();
    component.form.patchValue({ name: 'Asha', phone: '123' });
    await component.save();
    expect(create).not.toHaveBeenCalled();
    expect(component.invalid('phone')).toBe(true);
  });
  it('keeps input available after a failed save', async () => {
    create.mockRejectedValue(new Error('offline'));
    const component = TestBed.createComponent(Customers).componentInstance;
    await component.open();
    component.form.patchValue({ name: 'Asha', phone: '9876543210' });
    await component.save();
    expect(component.editorOpen()).toBe(true);
    expect(component.busy()).toBe(false);
    expect(component.form.controls.name.value).toBe('Asha');
    expect(component.formError()).not.toBe('');
  });
  it('loads the current record before editing and patches the same customer', async () => {
    const record = {
      _id: 'c1',
      name: 'Asha',
      phone: '+919876543210',
      notes: 'Old note',
    };
    get.mockResolvedValue(record);
    update.mockResolvedValue({ ...record, notes: 'Updated' });
    const component = TestBed.createComponent(Customers).componentInstance;
    await component.open(record);
    component.form.controls.notes.setValue('Updated');
    await component.save();
    expect(get).toHaveBeenCalledWith('c1');
    expect(update).toHaveBeenCalledWith('c1', {
      name: 'Asha',
      phone: '+919876543210',
      address: '',
      notes: 'Updated',
    });
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps sample saves and search isolated from the backend', async () => {
    data.preview = true;
    const component = TestBed.createComponent(Customers).componentInstance;
    await component.open();
    component.form.patchValue({ name: 'Sample Owner', phone: '9876543210' });
    await component.save();
    component.search.setValue('Sample Owner');
    await component.load();
    expect(component.rows()).toHaveLength(1);
    expect(create).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(component.notice()).toContain('preview only');
  });
});
