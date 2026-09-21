import * as React from 'react'
import { Column, Img, Link, Row, Section, Text } from 'react-email'

export const emailWebsite = 'https://www.annadanceacademy.com'
// Email images must remain public, including messages sent from local previews.
export const emailLogoUrl = `${emailWebsite}/images/branding/anna-dance-academy-mark.png`

export const emailBrandLogoStyles = `@media only screen and (max-width: 600px) {
  .email-brand-shell { padding: 28px 22px !important; }
  .email-brand-mark { width: 68px !important; height: 68px !important; }
  .email-brand-gap { padding-right: 16px !important; }
  .email-brand-name { font-size: 27px !important; line-height: 32px !important; }
  .email-brand-letter { font-size: 12px !important; line-height: 18px !important; }
}`

/** Email-safe counterpart of the horizontal wordmark in the site header and footer. */
export function EmailBrandLogo() {
  return (
    <Section
      tdClassName="email-brand-shell"
      style={{ padding: '36px 40px', backgroundColor: '#052f3d' }}
    >
      <Row align="center" width="auto" style={{ width: 'auto', margin: '0 auto' }}>
        <Column className="email-brand-gap" style={{ paddingRight: 24, verticalAlign: 'middle' }}>
          <Link href={emailWebsite}>
            <Img
              className="email-brand-mark"
              src={emailLogoUrl}
              alt="Anna Dance Academy dancer logo"
              width="88"
              height="88"
              style={{
                display: 'block',
                borderRadius: '50%',
                border: '1px solid #8199a0',
                backgroundColor: '#ffffff',
              }}
            />
          </Link>
        </Column>
        <Column style={{ verticalAlign: 'middle' }}>
          <Link
            href={emailWebsite}
            aria-label="Anna Dance Academy"
            style={{ color: '#ffffff', textDecoration: 'none' }}
          >
            <Text
              className="email-brand-name"
              style={{
                fontFamily: 'Georgia, Times New Roman, serif',
                fontWeight: 700,
                fontSize: 34,
                lineHeight: '40px',
                whiteSpace: 'nowrap',
                margin: '0 0 8px',
                color: '#ffffff',
              }}
            >
              Anna Dance
            </Text>
          </Link>
          <Row aria-hidden="true">
            {'ACADEMY'.split('').map((letter, index) => (
              <Column
                key={index}
                className="email-brand-letter"
                style={{
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  fontSize: 15,
                  lineHeight: '20px',
                  fontWeight: 600,
                  color: '#ffffff',
                  textAlign: index === 0 ? 'left' : index === 6 ? 'right' : 'center',
                }}
              >
                {letter}
              </Column>
            ))}
          </Row>
        </Column>
      </Row>
    </Section>
  )
}
