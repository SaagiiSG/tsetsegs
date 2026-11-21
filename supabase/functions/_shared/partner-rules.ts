// Saagii, 20 Nov 2026: tell partners straight when and whether they get paid.
export const PARTNER_RULES = [
  'You earn $10 when a student you invited pays for the yearly plan.',
  "Your $10 is due 14 days after they pay, as long as they don't get a refund in those 14 days. For most students that's 21 days after they sign up.",
  "Monthly plans and yearly renewals don't earn.",
] as const
export const PARTNER_EARNING_CENTS = 1000
export const partnerLink = (code: string) => `https://flowersos.co/solo?ref=${code}`
