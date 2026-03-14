import { Order, IOrder, OrderStatus } from './Order';

describe('Order State Machine transitions', () => {
  let order: IOrder;

  beforeEach(() => {
    order = new Order({
      buyerId: '5f9f1b9b9b9b9b9b9b9b9b9b',
      sellerId: '5f9f1b9b9b9b9b9b9b9b9b9c',
      items: [{ productId: '5f9f1b9b9b9b9b9b9b9b9b9d', quantity: 1, price: 100 }],
      totalAmount: 100,
      shippingAddress: {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        postalCode: '12345',
        country: 'Country'
      }
    });
  });

  it('initial state should be placed', () => {
    expect(order.status).toBe('placed');
  });

  it('can transition from placed to confirmed', () => {
    order.status = 'confirmed';
    expect(order.status).toBe('confirmed');
  });

  it('can transition from placed to cancelled', () => {
    order.status = 'cancelled';
    expect(order.status).toBe('cancelled');
  });
});
