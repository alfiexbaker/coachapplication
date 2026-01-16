# Component Security Reference

> **Security Implementation by Component**

## Overview

This document details security implementations across all Clubroom UI components. Each component follows security-by-design principles.

---

## Authentication Components

### LoginForm
**Location:** `components/auth/login-form.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Input sanitization | XSS prevention on all fields |
| Password masking | Hidden by default, toggle reveal |
| Rate limit feedback | Shows remaining attempts |
| No autocomplete for password | `autocomplete="new-password"` |
| Secure submission | HTTPS only, CSRF token |

**Data Handled:**
- Email (validated, not logged)
- Password (never logged, immediate hash)

**Security Events:**
- Login attempt logged
- Failed attempts tracked
- Account lockout notification

---

### RegisterForm
**Location:** `components/auth/register-form.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Password strength meter | Real-time validation |
| Confirm password | Match validation |
| Consent checkboxes | Required before submission |
| Email format validation | Client + server validation |
| No PII in URL params | Clean URLs |

**Data Handled:**
- Full registration PII
- Password (strength validated)
- Consent records

**Consent Recording:**
```typescript
{
  termsAccepted: boolean,
  termsVersion: string,
  privacyAccepted: boolean,
  privacyVersion: string,
  marketingOptIn: boolean,
  timestamp: string,
  ipHash: string
}
```

---

### ForgotPasswordForm
**Location:** `components/auth/forgot-password.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| No user enumeration | Same response for valid/invalid |
| Rate limiting | Max 3 requests/hour |
| Email validation | Format only, no existence check |
| Secure token delivery | Email only, no URL exposure |

**Security Pattern:**
```typescript
// Always returns success message regardless of email existence
return { message: "If an account exists, a reset email has been sent" };
```

---

### TwoFactorInput
**Location:** `components/auth/two-factor-input.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Auto-focus next input | UX without compromising security |
| Paste support | Full code paste allowed |
| Brute force protection | 5 attempts, then lockout |
| Code expiration display | Shows time remaining |

---

### BiometricAuthPrompt
**Location:** `components/auth/biometric-prompt.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Secure Enclave integration | Biometric data never leaves device |
| Fallback to passcode | Device security as backup |
| No biometric data storage | Challenge-response only |
| User consent required | Explicit opt-in |

---

## Booking Components

### BookingWizard
**Location:** `components/bookings/booking-wizard.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Step validation | Server validates each step |
| Session timeout | 30-minute draft expiration |
| Double-submit prevention | Idempotency keys |
| Price tampering prevention | Server-side calculation |

**Data Flow:**
```
User Input → Client Validation → Server Validation → Database
              │                    │
              └─ Sanitization      └─ Authorization check
                                      + Business rules
```

---

### BookingConfirmation
**Location:** `components/bookings/booking-confirmation.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Payment via Stripe Elements | No card data on our servers |
| Price verification | Final price from server |
| Confirmation ID display | Reference for disputes |
| Receipt email trigger | Server-side only |

---

### BookingHistory
**Location:** `components/bookings/booking-history.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| User-scoped queries | Only own bookings returned |
| Pagination | Prevents large data dumps |
| Status-based filtering | No access to others' bookings |
| Export limits | Max 100 records per export |

---

### CancelBookingModal
**Location:** `components/bookings/cancel-booking-modal.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Confirmation required | "CANCEL" typed to confirm |
| Policy display | Shows refund calculation |
| Reason required | For audit trail |
| Double-cancel prevention | Status check before action |

---

## Payment Components

### WalletView
**Location:** `components/payment/wallet-view.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Balance masking option | Hide sensitive amounts |
| Refresh on focus | Ensures current data |
| No caching | Financial data always fresh |
| Secure display | No clipboard access |

---

### TopUpForm
**Location:** `components/payment/topup-form.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Stripe Elements | PCI-compliant card input |
| 3D Secure support | Strong customer authentication |
| Amount limits | Min/max enforced |
| Idempotency | Prevents double charges |

**Stripe Integration:**
```typescript
// Card element - we never see card data
<CardElement options={{
  hidePostalCode: true,
  style: { /* themed */ }
}} />

// Payment confirmation with 3DS
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  { payment_method: paymentMethodId }
);
```

---

### PayoutSettings
**Location:** `components/payment/payout-settings.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Bank details masked | Only last 4 digits shown |
| Identity verification | Required before withdrawals |
| Change confirmation | Email notification on changes |
| Audit logging | All changes logged |

---

### TransactionHistory
**Location:** `components/payment/transaction-history.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Date range limits | Max 1 year per query |
| Export authentication | Re-auth for exports |
| Masked card numbers | Only last 4 in display |
| PDF generation | Server-side, signed |

---

## Family Components

### ChildProfile
**Location:** `components/family/child-profile.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Parent-only editing | Role check on all edits |
| Age display | Calculated, not stored |
| Photo restrictions | Moderation before display |
| Medical data separate | Explicit access control |

**Access Control:**
```typescript
// Only parent can edit child profile
if (currentUser.id !== child.parentId) {
  throw new AuthorizationError('Only parent can edit');
}
```

---

### GuardianInvite
**Location:** `components/family/guardian-invite.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Email verification | Required before access |
| Permission selection | Granular controls shown |
| Expiring invites | 7-day default expiration |
| Revocation display | Easy to revoke |

---

### FamilySettings
**Location:** `components/family/family-settings.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Permission matrix | Clear visualization |
| Audit trail | Shows recent changes |
| Confirmation dialogs | For destructive actions |
| Child protection | COPPA compliance indicators |

---

### ChildSelector
**Location:** `components/family/child-selector.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Authorized children only | Based on user relationship |
| No PII in component props | IDs only, fetch data |
| Selection validation | Server validates access |

---

## Messaging Components

### ChatView
**Location:** `components/messaging/chat-view.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Message sanitization | XSS prevention |
| Link previews | Sandboxed rendering |
| Blocked user handling | No message display |
| Report button | Easy access to report |

---

### MessageInput
**Location:** `components/messaging/message-input.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Character limits | Max 5000 chars |
| File type restrictions | Images, PDFs only |
| File size limits | 10MB per attachment |
| Content scanning | On upload |

**Allowed Attachments:**
```typescript
const allowedTypes = {
  'image/jpeg': { maxSize: 10 * 1024 * 1024 },
  'image/png': { maxSize: 10 * 1024 * 1024 },
  'image/heic': { maxSize: 10 * 1024 * 1024 },
  'application/pdf': { maxSize: 25 * 1024 * 1024 }
};
```

---

### ContactList
**Location:** `components/messaging/contact-list.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Blocked user filtering | Automatic exclusion |
| Relationship validation | Only connected users |
| Search sanitization | Prevent injection |
| No phone/email display | Platform handles contact |

---

### ReportMessage
**Location:** `components/messaging/report-message.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Reporter anonymity | Identity protected |
| Message preservation | Original stored for review |
| Category selection | Structured reporting |
| Follow-up tracking | Status updates to reporter |

---

## Content Components

### VideoPlayer
**Location:** `components/video/video-player.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Signed URL playback | Token-based access |
| No download button | Streaming only (configurable) |
| Watermarking | User ID embedded |
| Screenshot detection | Alert on mobile |

---

### VideoUpload
**Location:** `components/video/video-upload.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| File type validation | Magic bytes check |
| Size limits | 500MB max |
| Progress indication | Upload status |
| Virus scan indication | Shows scan status |

---

### DrillCard
**Location:** `components/drills/drill-card.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Ownership display | Clear attribution |
| Share restrictions | Based on permissions |
| Preview limits | Full content auth required |

---

## Profile Components

### ProfileEditor
**Location:** `components/profile/profile-editor.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Field validation | Format enforcement |
| Photo moderation | Before display |
| Change notifications | Email on sensitive changes |
| Version history | Track changes |

---

### PrivacySettings
**Location:** `components/profile/privacy-settings.tsx`

| Security Feature | Implementation |
|-----------------|----------------|
| Consent management | GDPR/CCPA compliant |
| Clear explanations | Plain language |
| Immediate effect | Changes apply instantly |
| Export request | Data portability |

---

## Security Component Patterns

### Input Sanitization Pattern

```typescript
// All user inputs sanitized
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')  // Basic XSS prevention
    .slice(0, MAX_LENGTH);  // Length limit
};
```

### Authorization Check Pattern

```typescript
// All components check authorization
const Component = () => {
  const { user, isAuthorized } = useAuth();

  if (!isAuthorized('resource:action')) {
    return <UnauthorizedView />;
  }

  return <AuthorizedContent />;
};
```

### Secure Data Display Pattern

```typescript
// Sensitive data masked by default
const DisplayEmail = ({ email, canReveal }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <span>
      {revealed && canReveal ? email : maskEmail(email)}
      {canReveal && (
        <button onClick={() => setRevealed(!revealed)}>
          {revealed ? 'Hide' : 'Show'}
        </button>
      )}
    </span>
  );
};
```

---

## Component Testing Requirements

All components must have tests covering:

- [ ] Unauthorized access attempts
- [ ] Input validation edge cases
- [ ] XSS attack vectors
- [ ] CSRF protection
- [ ] Sensitive data masking
- [ ] Error state handling
- [ ] Loading state security
