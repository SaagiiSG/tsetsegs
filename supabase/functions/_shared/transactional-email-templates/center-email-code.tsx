import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { centerEmailCodeSubject } from './center-email-code-fields.ts'

const CenterEmailCode = (d: { code: string; center_name: string }) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{centerEmailCodeSubject(d)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your sign-up code</Heading>
        <Text style={code}>{d.code}</Text>
        <Text style={row}>It works for 10 minutes. If you didn't ask for it, ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CenterEmailCode,
  subject: centerEmailCodeSubject,
  displayName: 'Center sign-up email code',
  previewData: { code: '482913', center_name: 'Bright Future Academy' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const code = { fontSize: '36px', fontWeight: 'bold', letterSpacing: '8px', color: '#1a1a2e', margin: '0 0 16px' }
const row = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.5', margin: '0 0 6px' }
