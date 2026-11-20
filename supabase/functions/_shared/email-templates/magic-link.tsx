/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, code, text } from '../email-layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <EmailLayout
    preview={token ? `Your sign-in code is ${token}` : 'Your sign-in link'}
    heading={token ? 'Your sign-in code' : 'Your sign-in link'}
    footer="Didn't ask to sign in? You can ignore this email."
  >
    {token && (
      <>
        <Text style={text}>Enter this code on the sign-in page.</Text>
        <Text style={code}>{token}</Text>
      </>
    )}
    <Text style={text}>
      {token ? 'Or tap the button to sign in.' : 'Tap the button to sign in.'}
    </Text>
    <Button style={button} href={confirmationUrl}>
      Sign in
    </Button>
  </EmailLayout>
)

export default MagicLinkEmail
