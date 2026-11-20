/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, text } from '../email-layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview="Reset your flowersos password"
    heading="Reset your password"
    footer="Didn't ask for this? You can ignore this email. Your password stays the same."
  >
    <Text style={text}>Tap the button to pick a new password.</Text>
    <Button style={button} href={confirmationUrl}>
      Reset password
    </Button>
  </EmailLayout>
)

export default RecoveryEmail
