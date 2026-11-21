import * as React from 'npm:react@18.3.1'
import { Button, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { EmailLayout, button, text } from '../email-layout.tsx'
import { PARTNER_RULES, partnerLink } from '../partner-rules.ts'

type Data = { name?: string; code?: string; link?: string; rules?: readonly string[]; signIn?: string }

const subject = () => 'Welcome to flowersos partners'

/** Sent by partner-welcome when admin approves an application. */
const PartnerWelcome = (d: Data) => (
  <EmailLayout
    preview={subject()}
    heading="You're a flowersos partner"
    footer="You're getting this because you applied to be a flowersos partner."
  >
    <Text style={text}>Hi {d.name}, your application is approved.</Text>
    <Text style={text}>Your code is <strong>{d.code}</strong>. Share this link with students:</Text>
    <Text style={text}>{d.link}</Text>
    <Text style={text}><strong>How you get paid</strong></Text>
    {(d.rules ?? []).map((rule) => <Text key={rule} style={text}>{rule}</Text>)}
    <Text style={text}>To see your link and your earnings, sign in with this email address. We will send you a code.</Text>
    <Button style={button} href={d.signIn}>Open your dashboard</Button>
  </EmailLayout>
)

export const template = {
  component: PartnerWelcome,
  subject,
  displayName: 'Partner welcome',
  previewData: { name: 'Bold', code: 'BOLD10', link: partnerLink('BOLD10'), rules: PARTNER_RULES, signIn: 'https://flowersos.co/partner/dashboard' },
} satisfies TemplateEntry
