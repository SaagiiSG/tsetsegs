// Whop payment (checked read-only 21 Nov): id, membership_id (mem_), variant_id (the plan_ bought; no plan field), total.amount (string "39.00"), paid_at, metadata.customer_id. refund.created: payment_id. dispute.created: payment.id. Older shapes are read too.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? v as Obj : {})
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

export function paymentFields(data: unknown) {
  const d = obj(data)
  const payment = str(d.id)
  const paidAt = str(d.paid_at)
  if (!payment || !paidAt) return null
  const total = typeof d.total === 'object' ? obj(d.total).amount : d.total
  const customer = obj(d.metadata).customer_id
  return {
    payment,
    membership: str(d.membership_id) ?? str(obj(d.membership).id),
    user: typeof customer === 'string' && UUID_RE.test(customer) ? customer : null,
    plan: str(d.plan_id) ?? str(obj(d.plan).id) ?? str(d.variant_id),
    amount: Number(total) || 0,
    paidAt,
  }
}

export const refundPaymentId = (data: unknown) => str(obj(obj(data).payment).id) ?? str(obj(data).payment_id)

export const yearlyPlans = (plans: Record<string, string>) => new Set([plans.yearly, plans.yearly_early].filter(Boolean))
