import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { oneLine } from './educator-demo-request-fields.ts'

type Data = { name?: string; email?: string; kind?: string; link?: string; country?: string; message?: string }

const ADMIN_URL = 'https://flowersos.co/admin/partners'

// The applicant typed all of it, so the subject is forced onto one line (it is a mail header).
const subject = (d: Data) => `New partner application: ${oneLine(d.name).slice(0, 100) || 'someone'}`

// Owner alert sent by notify-partner-application.
const PartnerApplication = (d: Data) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject(d)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New partner application</Heading>
        {([['Name', d.name], ['Email', d.email], ['Kind', d.kind], ['Link', d.link], ['Country', d.country]] as const).map(([label, value]) => (
          <Text key={label} style={row}><strong>{label}:</strong> {oneLine(value) || '—'}</Text>
        ))}
        {d.message ? <Text style={message}>{d.message}</Text> : null}
        <Button href={ADMIN_URL} style={button}>Open partners</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartnerApplication,
  subject,
  // Fixed recipient: the owner asked for these alerts here, and callers cannot redirect them.
  to: 'saranochir.s@gmail.com',
  displayName: 'Partner application (owner alert)',
  previewData: { name: 'Bold', email: 'bold@example.com', kind: 'Tutor', link: 'https://instagram.com/bold', country: 'Mongolia', message: 'I tutor 12 students for the SAT.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.5', margin: '0 0 6px' }
const message = { ...row, whiteSpace: 'pre-wrap' as const, margin: '16px 0 0', padding: '12px 14px', backgroundColor: '#f4f4f7', borderRadius: '6px' }
const button = { backgroundColor: '#1a1a2e', color: '#ffffff', fontSize: '15px', padding: '12px 20px', borderRadius: '6px', marginTop: '24px' }
