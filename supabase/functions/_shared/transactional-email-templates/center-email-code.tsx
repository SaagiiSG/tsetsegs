import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { centerEmailCodeSubject } from './center-email-code-fields.ts'
import { EmailLayout, code, text } from '../email-layout.tsx'

const CenterEmailCode = (d: { code: string; center_name: string }) => (
  <EmailLayout
    preview={centerEmailCodeSubject(d)}
    heading="Your sign-up code"
    footer="Didn't ask for this code? You can ignore this email."
  >
    <Text style={text}>Enter this code to finish signing up.</Text>
    <Text style={code}>{d.code}</Text>
    <Text style={{ ...text, margin: '0' }}>It works for 10 minutes.</Text>
  </EmailLayout>
)

export const template = {
  component: CenterEmailCode,
  subject: centerEmailCodeSubject,
  displayName: 'Center sign-up email code',
  previewData: { code: '482913', center_name: 'Bright Future Academy' },
} satisfies TemplateEntry
