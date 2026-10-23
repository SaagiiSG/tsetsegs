import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { type DemoRequest, demoRequestRows, demoRequestSubject } from './educator-demo-request-fields.ts'

const ADMIN_URL = 'https://flowersos.co/admin/demo-requests'

// Owner alert sent by notify-demo-request. All props are visitor-typed text (see the fields file).
const EducatorDemoRequest = (r: DemoRequest) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{demoRequestSubject(r)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New educator demo request</Heading>
        {demoRequestRows(r).map(([label, value]) => (
          <Text key={label} style={row}><strong>{label}:</strong> {value}</Text>
        ))}
        {r.message ? <Text style={message}>{r.message}</Text> : null}
        <Button href={ADMIN_URL} style={button}>Open demo requests</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EducatorDemoRequest,
  subject: demoRequestSubject,
  // Fixed recipient: the owner asked for these alerts here, and callers cannot redirect them.
  to: 'saranochir.s@gmail.com',
  displayName: 'Educator demo request (owner alert)',
  previewData: {
    name: 'Bat-Erdene',
    institution_name: 'Bright Future Academy',
    email: 'bat@example.com',
    phone: '+976 9911 2233',
    country: 'Mongolia',
    student_count: 40,
    message: 'We run SAT classes for 40 students.\n\nSource: websummit',
    created_at: '2026-11-10T09:30:00Z',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.5', margin: '0 0 6px' }
const message = { ...row, whiteSpace: 'pre-wrap' as const, margin: '16px 0 0', padding: '12px 14px', backgroundColor: '#f4f4f7', borderRadius: '6px' }
const button = { backgroundColor: '#1a1a2e', color: '#ffffff', fontSize: '15px', padding: '12px 20px', borderRadius: '6px', marginTop: '24px' }
