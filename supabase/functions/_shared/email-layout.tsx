/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

// The landing page's look (sky, white card, black pill) for the sign-in and code emails.
// The logo is the app's public/email file, so it only loads once the site is published.
const LOGO_URL = 'https://flowersos.co/email/flowersos-logo.png'

interface EmailLayoutProps {
  preview: string
  heading: string
  footer: string
  children: React.ReactNode
}

export const EmailLayout = ({
  preview,
  heading,
  footer,
  children,
}: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      {/* Light only: the card and the flat logo are drawn for a white page. */}
      <meta name="color-scheme" content="light" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Img src={LOGO_URL} width="145" height="28" alt="flowersos" style={logo} />
        <Heading style={h1}>{heading}</Heading>
        {children}
      </Container>
      <Container style={footerBox}>
        <Text style={footerText}>
          {footer}
          <br />
          <Link href="https://flowersos.co" style={footerLink}>
            flowersos.co
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

// Colors are the .landing-v2 tokens in src/components/landing/landing.css.
const ink = '#171717'
const muted = '#666666'
const sans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const main = {
  backgroundColor: '#e7f4fd',
  fontFamily: sans,
  margin: '0',
  padding: '32px 12px',
}
const card = {
  backgroundColor: '#ffffff',
  border: '2px solid #f0f0f0',
  borderRadius: '24px',
  padding: '32px 28px',
  maxWidth: '480px',
}
const logo = { display: 'block', border: '0' }
const h1 = {
  fontFamily: `Chillax, ${sans}`,
  fontSize: '28px',
  fontWeight: '600' as const,
  letterSpacing: '-0.02em',
  lineHeight: '1.15',
  color: ink,
  margin: '32px 0 12px',
}
const footerBox = { maxWidth: '480px' }
const footerText = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: muted,
  textAlign: 'center' as const,
  margin: '20px 0 0',
}
const footerLink = { color: muted, textDecoration: 'underline' }

export const text = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: muted,
  margin: '0 0 20px',
}
// Digits stay one word, so a long press or double click selects the whole code.
export const code = {
  backgroundColor: '#f5f5f5',
  borderRadius: '16px',
  // Extra left padding offsets the letter spacing after the last digit, keeping it centered.
  padding: '18px 8px 18px 14px',
  fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
  fontSize: '32px',
  fontWeight: '600' as const,
  letterSpacing: '6px',
  lineHeight: '1.2',
  textAlign: 'center' as const,
  color: ink,
  margin: '0 0 20px',
}
export const button = {
  backgroundColor: ink,
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
}
