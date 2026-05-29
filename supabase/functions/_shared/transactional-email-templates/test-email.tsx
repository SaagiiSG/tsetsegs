import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Tsetsegs SAT Prep'

interface TestEmailProps {
  name?: string
  message?: string
}

const TestEmail = ({ name, message }: TestEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Test email from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hi ${name}!` : 'Hi there!'}
        </Heading>
        <Text style={text}>
          {message ?? `This is a test email from ${SITE_NAME}. If you received this, your inbox is connected and we can reach you with announcements.`}
        </Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TestEmail,
  subject: `Test email from ${SITE_NAME}`,
  displayName: 'Test email',
  previewData: { name: 'Saranochir' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#1a1a2e', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3a3a4a', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { fontSize: '13px', color: '#8a8a9a', margin: '32px 0 0' }
