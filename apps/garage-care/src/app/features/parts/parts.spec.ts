import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AuthApi, PartsApi } from '@garage-care/shared/data-access';
import { Parts, toPaise } from './parts';
describe('Parts catalog', () => {
  const list = vi.fn();
  const create = vi.fn();
  beforeEach(() => {
    list
      .mockReset()
      .mockResolvedValue({ data: [], page: { nextCursor: null } });
    create
      .mockReset()
      .mockResolvedValue({
        _id: 'p1',
        name: 'Oil',
        category: 'Lubricants',
        mrpPaise: 29,
      });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
        {
          provide: AuthApi,
          useValue: { user: signal(null), garage: signal(null) },
        },
        { provide: PartsApi, useValue: { list, create } },
      ],
    });
  });
  it('converts decimal rupees to exact integer paise', async () => {
    expect(toPaise('0.29')).toBe(29);
    expect(toPaise('1234.5')).toBe(123450);
    const component = TestBed.createComponent(Parts).componentInstance;
    await component.open();
    component.form.patchValue({
      name: 'Oil',
      category: 'Lubricants',
      price: '0.29',
    });
    await component.save();
    expect(create).toHaveBeenCalledWith({
      name: 'Oil',
      category: 'Lubricants',
      mrpPaise: 29,
    });
  });
  it('rejects fractional paise and prices above backend limits', async () => {
    const component = TestBed.createComponent(Parts).componentInstance;
    component.form.patchValue({ name: 'Oil', category: 'Oil', price: '1.001' });
    await component.save();
    expect(create).not.toHaveBeenCalled();
    component.form.controls.price.setValue('10000000.01');
    await component.save();
    expect(create).not.toHaveBeenCalled();
  });
});
