import { describe, expect, it } from 'vitest';
import { paymentFields, refundPaymentId, yearlyPlans } from '../../supabase/functions/_shared/partner-payment';

const UUID = '0b9f6d2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const docShape = { id: 'pay_1', membership_id: 'mem_1', plan_id: 'plan_y', total: { amount: '39.00' }, paid_at: '2026-12-10T10:00:00Z', metadata: { customer_id: UUID } };

describe('partner payment events', () => {
  it('reads a payment in the shapes Whop sends', () => {
    expect(paymentFields(docShape)).toEqual({ payment: 'pay_1', membership: 'mem_1', user: UUID, plan: 'plan_y', amount: 39, paidAt: '2026-12-10T10:00:00Z' });
    expect(paymentFields({ ...docShape, total: 39, membership_id: undefined, membership: { id: 'mem_1' }, plan_id: undefined, plan: { id: 'plan_y' } })?.membership).toBe('mem_1');
    expect(paymentFields({ ...docShape, plan_id: undefined, variant_id: 'plan_v' })?.plan).toBe('plan_v');
    expect(paymentFields({ ...docShape, metadata: { customer_id: 'not-a-uuid' } })?.user).toBeNull();
    expect(paymentFields({ ...docShape, total: { amount: '0.00' } })?.amount).toBe(0);
  });

  it('returns null when the payment id or paid_at is missing', () => {
    expect(paymentFields({ id: 'pay_1' })).toBeNull();
    expect(paymentFields({ ...docShape, id: undefined })).toBeNull();
    expect(paymentFields(null)).toBeNull();
  });

  it('finds the payment a refund or dispute points at', () => {
    expect(refundPaymentId({ payment: { id: 'pay_1' } })).toBe('pay_1');
    expect(refundPaymentId({ payment_id: 'pay_2' })).toBe('pay_2');
    expect(refundPaymentId({})).toBeNull();
  });

  it('lists the set yearly plan ids', () => {
    expect([...yearlyPlans({ monthly: 'a', yearly: 'b', yearly_early: 'c' })]).toEqual(['b', 'c']);
    expect([...yearlyPlans({ monthly: 'a' })]).toEqual([]);
  });
});
