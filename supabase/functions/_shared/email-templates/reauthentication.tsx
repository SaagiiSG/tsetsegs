/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, code, text } from '../email-layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview={`Your verification code is ${token}`}
    heading="Your verification code"
    footer="Didn't ask for this code? You can ignore this email."
  >
    <Text style={text}>Enter this code to show it's you.</Text>
    <Text style={{ ...code, margin: '0' }}>{token}</Text>
  </EmailLayout>
)

export default ReauthenticationEmail
