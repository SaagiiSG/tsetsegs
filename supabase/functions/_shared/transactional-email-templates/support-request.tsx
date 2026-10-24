import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { type SupportRequest, supportRequestRows, supportRequestSubject } from './support-request-fields.ts'

const ADMIN_URL = 'https://flowersos.co/admin/support'

// Owner alert sent by notify-support-request. Subject and message are staff-typed text (see the fields file).
const SupportRequestEmail = (r: SupportRequest) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{supportRequestSubject(r)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New support request</Heading>
        {supportRequestRows(r).map(([label, value]) => (
          <Text key={label} style={row}><strong>{label}:</strong> {value}</Text>
        ))}
        {r.message ? <Text style={message}>{r.message}</Text> : null}
        <Text style={row}>Reply to this email to answer them.</Text>
        <Button href={ADMIN_URL} style={button}>Open support inbox</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportRequestEmail,
  subject: supportRequestSubject,
  // Fixed recipient: callers cannot redirect these alerts.
  to: 'saranochir.s@gmail.com',
  displayName: 'Center support request (owner alert)',
  previewData: {
    center_name: 'Bright Future Academy',
    name: 'Bat-Erdene',
    role: 'center_admin',
    email: 'bat@example.com',
    subject: 'Question about our bill',
    message: 'Hi, we paid on Monday but the portal still shows a warning.\n\nThanks!',
    created_at: '2026-11-10T09:30:00Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.5', margin: '0 0 6px' }
const message = { ...row, whiteSpace: 'pre-wrap' as const, margin: '16px 0', padding: '12px 14px', backgroundColor: '#f4f4f7', borderRadius: '6px' }
const button = { backgroundColor: '#1a1a2e', color: '#ffffff', fontSize: '15px', padding: '12px 20px', borderRadius: '6px', marginTop: '24px' }
