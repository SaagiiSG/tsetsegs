import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { oneLine } from './educator-demo-request-fields.ts'

type Payout = { partner_name?: string; code?: string; amount?: string; due?: string }
type Data = { payouts?: Payout[] }

const subject = () => 'Partner payouts due today'

// Owner reminder sent by partner-payouts-due each morning; the partner's name is typed by the partner.
const PartnerPayoutsDue = ({ payouts = [] }: Data) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject()}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Partner payouts due today</Heading>
        {payouts.map((p, i) => (
          <Text key={i} style={row}>
            <strong>{oneLine(p.partner_name) || '—'}</strong> ({oneLine(p.code)}): {p.amount}, due {p.due}
          </Text>
        ))}
        <Button href="https://flowersos.co/admin/partners" style={button}>Open partners</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerPayoutsDue,
  subject,
  to: 'saranochir.s@gmail.com',
  displayName: 'Partner payouts due (owner reminder)',
  previewData: { payouts: [{ partner_name: 'Bold', code: 'BOLD10', amount: '$10', due: '24 Dec 2026' }] },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.5', margin: '0 0 6px' }
const button = { backgroundColor: '#1a1a2e', color: '#ffffff', fontSize: '15px', padding: '12px 20px', borderRadius: '6px', marginTop: '24px' }
