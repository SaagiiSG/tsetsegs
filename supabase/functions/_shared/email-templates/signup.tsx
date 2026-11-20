/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, code, text } from '../email-layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({ confirmationUrl, token }: SignupEmailProps) => (
  <EmailLayout
    preview={token ? `Your sign-in code is ${token}` : 'Confirm your email'}
    heading="Confirm your email"
    footer="Didn't ask to sign in? You can ignore this email."
  >
    {token && (
      <>
        <Text style={text}>Enter this code to finish signing up.</Text>
        <Text style={code}>{token}</Text>
      </>
    )}
    <Text style={text}>
      {token ? 'Or tap the button.' : 'Tap the button to confirm your email.'}
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm email
    </Button>
  </EmailLayout>
)

export default SignupEmail
