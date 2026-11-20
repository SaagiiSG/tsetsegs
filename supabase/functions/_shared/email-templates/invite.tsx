/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Button, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, button, text } from '../email-layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview="You're invited to join flowersos"
    heading="You're invited"
    footer="Not expecting this? You can ignore this email."
  >
    <Text style={text}>
      You're invited to join flowersos. Tap the button to set up your account.
    </Text>
    <Button style={button} href={confirmationUrl}>
      Accept invite
    </Button>
  </EmailLayout>
)

export default InviteEmail
