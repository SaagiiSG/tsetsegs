import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, button, text } from '../email-layout.tsx'

type Data = { ends?: string; price?: string | null }

const subject = (d: Data) => `Your free trial ends on ${d.ends ?? 'soon'}`

/** Two days before a solo Premium trial ends (the Terms promise a reminder). Sent by trial-reminders. */
const TrialReminder = (d: Data) => (
  <EmailLayout
    preview={subject(d)}
    heading="Your free trial ends in 2 days"
    footer="You're getting this because you started a free trial of flowersos Premium."
  >
    <Text style={text}>
      Your flowersos Premium trial ends on {d.ends}.{' '}
      {d.price ? `After that, Premium continues at ${d.price}, charged to the card you added.` : 'After that, Premium continues and the card you added is charged.'}
    </Text>
    <Text style={text}>Want to keep going? You don't need to do anything.</Text>
    <Text style={text}>Not for you? Cancel in Billing before {d.ends} and you won't be charged.</Text>
    <Button style={button} href="https://flowersos.co/solo/student/billing">Open Billing</Button>
  </EmailLayout>
)

export const template = {
  component: TrialReminder,
  subject,
  displayName: 'Solo Premium trial reminder',
  previewData: { ends: '4 Dec 2026', price: '$39 a year' },
} satisfies TemplateEntry
