/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, text } from '../email-layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview="Confirm your new flowersos email"
    heading="Confirm your new email"
    footer="Didn't ask for this? Change your password right away."
  >
    <Text style={text}>
      You asked to change your email from <strong>{oldEmail}</strong> to{' '}
      <strong>{newEmail}</strong>. Tap the button to confirm.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Confirm new email
    </Button>
  </EmailLayout>
)

export default EmailChangeEmail
