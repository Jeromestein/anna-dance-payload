import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from 'react-email'

import { billPath, money, type Bill } from '@/lib/billing/model'
import { EmailBrandLogo, emailBrandLogoStyles, emailWebsite } from './email-brand-logo'

const website = emailWebsite
const rose = '#a8326a'
const ink = '#302630'
const muted = '#756775'
const paragraph: React.CSSProperties = { fontSize: 15, lineHeight: '25px', color: muted }
const label: React.CSSProperties = {
  fontSize: 11,
  lineHeight: '18px',
  fontWeight: 700,
  letterSpacing: '1.4px',
  color: rose,
  margin: '0 0 12px',
}

function EmailLayout({
  preview,
  category,
  title,
  intro,
  sandbox = false,
  children,
}: {
  preview: string
  category: string
  title: string
  intro: string
  sandbox?: boolean
  children: React.ReactNode
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <style>{emailBrandLogoStyles}</style>
        <style>{`@media only screen and (max-width: 600px) {
          .email-content { padding: 28px 22px !important; }
          .email-title { font-size: 29px !important; line-height: 35px !important; }
          .email-shell { margin: 16px auto !important; }
        }`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#faf5f7',
          fontFamily: 'Arial, Helvetica, sans-serif',
          margin: 0,
          color: ink,
        }}
      >
        <Container
          className="email-shell"
          style={{ maxWidth: 600, margin: '36px auto', width: '100%' }}
        >
          <EmailBrandLogo />
          <Section
            tdClassName="email-content"
            style={{
              padding: '36px 40px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #eee3e9',
            }}
          >
            {sandbox && (
              <Text
                style={{
                  ...paragraph,
                  backgroundColor: '#fff4d9',
                  padding: '12px 16px',
                  color: '#755014',
                  margin: '0 0 24px',
                }}
              >
                SANDBOX — no real money. This notice is routed to the test inbox.
              </Text>
            )}
            <Text style={label}>{category}</Text>
            <Heading
              className="email-title"
              as="h1"
              style={{
                fontFamily: 'Georgia, Times New Roman, serif',
                fontWeight: 400,
                fontSize: 34,
                lineHeight: '40px',
                letterSpacing: '-0.5px',
                margin: '0 0 16px',
                color: ink,
              }}
            >
              {title}
            </Heading>
            <Text style={{ ...paragraph, margin: '0 0 28px' }}>{intro}</Text>
            {children}
          </Section>
          <Section style={{ padding: '24px 24px 12px', textAlign: 'center' }}>
            <Text style={{ fontSize: 12, lineHeight: '20px', color: muted, margin: 0 }}>
              Anna Dance Academy · Lutz, Florida
            </Text>
            <Text style={{ fontSize: 12, lineHeight: '20px', color: muted, margin: '8px 0' }}>
              Questions?{' '}
              <Link
                href="tel:+17014009213"
                style={{ color: rose, textDecoration: 'underline' }}
              >
                Call Us
              </Link>
              {' · '}
              <Link href={website} style={{ color: rose, textDecoration: 'underline' }}>
                Visit our website
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Details({ rows }: { rows: Array<[string, string | null | undefined]> }) {
  return (
    <Section
      style={{
        backgroundColor: '#faf5f7',
        padding: '18px 20px',
        borderRadius: 8,
        margin: '0 0 24px',
      }}
    >
      {rows
        .filter(([, value]) => value)
        .map(([name, value]) => (
          <Text
            key={name}
            style={{
              margin: '7px 0',
              fontSize: 14,
              lineHeight: '23px',
              color: ink,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ color: muted }}>{name}: </span>
            {value}
          </Text>
        ))}
    </Section>
  )
}

function Action({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: '28px 0 4px' }}>
      <Button
        href={href}
        style={{
          backgroundColor: rose,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 700,
          borderRadius: 6,
          padding: '16px 24px',
          textDecoration: 'none',
        }}
      >
        {children}
      </Button>
    </Section>
  )
}

function Message({ title, children }: { title: string; children: string }) {
  return (
    <Section style={{ margin: '24px 0' }}>
      <Text style={label}>{title}</Text>
      <Text
        style={{
          ...paragraph,
          color: ink,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          margin: 0,
        }}
      >
        {children}
      </Text>
    </Section>
  )
}

export type ContactEmailProps = {
  name: string
  email: string
  age: string
  interest: string
  message: string
}

export function ContactEmail({ name, email, age, interest, message }: ContactEmailProps) {
  return (
    <EmailLayout
      category="Website Inquiry"
      title="A New Conversation"
      preview={`New ${interest} Inquiry from ${name}`}
      intro="A family has reached out through the website. Their inquiry and contact details are below."
    >
      <Details
        rows={[
          ['Parent or guardian', name],
          ['Email', email],
          ['Dancer’s age', age],
          ['Class interest', interest],
        ]}
      />
      <Message title="Their Message">{message}</Message>
      <Action href={`mailto:${email}`}>Reply to Inquiry</Action>
      <Text style={{ ...paragraph, fontSize: 12 }}>You can also reply directly to this email.</Text>
    </EmailLayout>
  )
}

export type RegistrationEmailProps = {
  studentName: string
  email: string
  studentPhone: string
  guardianName: string
  guardianPhone: string
  registeredAt: string
  adminLink?: string
}

export function RegistrationEmail(props: RegistrationEmailProps) {
  return (
    <EmailLayout
      category="Student Registration"
      title="A New Dancer Joins Us"
      preview={`New Student Registration: ${props.studentName}`}
      intro="A new student account has been created. Review the registration details below."
    >
      <Details
        rows={[
          ['Student name', props.studentName],
          ['Registration email', props.email],
          ['Student phone', props.studentPhone],
          ['Parent/guardian name', props.guardianName],
          ['Parent/guardian phone', props.guardianPhone],
          ['Registered at', props.registeredAt],
        ]}
      />
      {props.adminLink && <Action href={props.adminLink}>View Student Account</Action>}
    </EmailLayout>
  )
}

export type BillingEmailKind =
  'request' | 'paid_customer' | 'paid_admin' | 'refunded_customer' | 'refunded_admin'
export type BillingEmailProps = {
  kind: BillingEmailKind
  bill: Bill
  studentName: string
  accountEmail: string
  origin: string
  owner: string
  teacherNote?: string | null
}

export function BillingEmail({
  kind,
  bill,
  studentName,
  accountEmail,
  origin,
  owner,
  teacherNote,
}: BillingEmailProps) {
  const request = kind === 'request'
  const refund = kind === 'refunded_customer' || kind === 'refunded_admin'
  const admin = kind === 'paid_admin' || kind === 'refunded_admin'
  const title = request
    ? 'Your Next Step to Dance'
    : refund
      ? 'Full Refund Confirmed'
      : admin
        ? 'A Payment Has Arrived'
        : 'Thank You for Your Payment'
  const intro = request
    ? 'Your course bill is ready. Sign in with your registered account to review and pay.'
    : refund
      ? admin
        ? 'A student’s full refund has been confirmed by Stripe.'
        : 'Your full refund has been confirmed by Stripe.'
      : admin
        ? 'A student payment has been confirmed.'
        : 'Your payment has been confirmed.'
  return (
    <EmailLayout
      category={
        request ? 'Payment Request' : refund ? 'Refund Confirmation' : 'Payment Confirmation'
      }
      title={title}
      intro={intro}
      preview={`${refund ? 'Full Refund Confirmed' : request ? 'Payment Requested' : 'Payment Confirmed'} · ${bill.bill_number}`}
      sandbox={bill.stripe_livemode === false}
    >
      <Details
        rows={[
          ['Student', studentName],
          ['Account email', admin ? accountEmail : null],
          ['Bill', bill.bill_number],
          ['Due date', request ? bill.due_date : null],
        ]}
      />
      <Text style={label}>Course Details</Text>
      <table
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                fontSize: 12,
                color: muted,
                padding: '0 0 12px',
                fontWeight: 400,
              }}
            >
              Description
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'right',
                fontSize: 12,
                color: muted,
                padding: '0 0 12px',
                width: '30%',
                fontWeight: 400,
              }}
            >
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {[...bill.app_payment_items]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((item, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: '14px 12px 14px 0',
                    borderTop: '1px solid #eee3e9',
                    verticalAlign: 'top',
                    fontSize: 14,
                    lineHeight: '22px',
                    color: ink,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.description}
                  <br />
                  <span style={{ fontSize: 12, color: muted }}>
                    {item.quantity} × {money(item.unit_amount_cents, bill.currency)}
                  </span>
                </td>
                <td
                  style={{
                    padding: '14px 0',
                    borderTop: '1px solid #eee3e9',
                    textAlign: 'right',
                    verticalAlign: 'top',
                    fontSize: 14,
                    lineHeight: '22px',
                    color: ink,
                  }}
                >
                  {money(item.quantity * item.unit_amount_cents, bill.currency)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <Section
        style={{
          backgroundColor: '#f8edf3',
          padding: '20px',
          margin: '12px 0 24px',
          borderRadius: 8,
        }}
      >
        <Text style={{ ...label, margin: '0 0 4px' }}>
          {refund ? 'Refund Amount' : request ? 'Total Due' : 'Total Paid'}
        </Text>
        <Text
          style={{
            fontSize: 32,
            lineHeight: '40px',
            fontFamily: 'Georgia, Times New Roman, serif',
            color: rose,
            margin: 0,
          }}
        >
          {money(bill.amount_cents, bill.currency)}
        </Text>
        {refund && (
          <Text style={{ ...paragraph, margin: '6px 0 0', fontSize: 13 }}>
            Destination: Original payment method.
          </Text>
        )}
      </Section>
      {refund && (bill.refunded_at || bill.refund_reference) && (
        <Details
          rows={[
            ['Refund confirmed', bill.refunded_at],
            ['Refund reference', bill.refund_reference],
          ]}
        />
      )}
      {refund && (
        <Text style={paragraph}>
          Your bank or payment provider may need additional time to show the refund. This
          confirmation does not mean it has already appeared on your statement.
        </Text>
      )}
      {admin && !refund && teacherNote && (
        <Message title="Message for the Teacher">{teacherNote}</Message>
      )}
      <Action href={admin ? `${origin}/admin/students/${owner}` : `${origin}${billPath(bill.id)}`}>
        {admin ? 'View Student Record' : request ? 'Review and Pay' : 'View Payment Record'}
      </Action>
      {request && (
        <Text style={{ ...paragraph, fontSize: 12 }}>
          Please sign in using the email address associated with your student account.
        </Text>
      )}
      <Hr style={{ borderColor: '#eee3e9', margin: '28px 0 20px' }} />
      <Text style={{ ...paragraph, fontSize: 13, margin: 0 }}>
        Thank you for being part of Anna Dance Academy.
      </Text>
    </EmailLayout>
  )
}

export const renderContactEmail = (props: ContactEmailProps) => render(<ContactEmail {...props} />)
export const renderRegistrationEmail = (props: RegistrationEmailProps) =>
  render(<RegistrationEmail {...props} />)
export const renderBillingEmail = (props: BillingEmailProps) => render(<BillingEmail {...props} />)
