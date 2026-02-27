import { LegalDocumentScreen, type LegalDocumentSection } from '@/components/settings/legal-document-screen';

const TERMS_SECTIONS: LegalDocumentSection[] = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using the Clubroom application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. We reserve the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of any changes.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old to create an account. Parents and guardians may create accounts to manage bookings on behalf of minors. Coaches must be at least 18 years old and may be required to complete verification and background checks before offering services.',
  },
  {
    title: '3. User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account. We reserve the right to suspend or terminate accounts that violate these Terms.',
  },
  {
    title: '4. Bookings and Payments',
    body: 'All session bookings are subject to coach availability and confirmation. Payments are processed securely through our platform. Cancellation policies vary by coach and are displayed at the time of booking. Refunds are handled in accordance with the applicable cancellation policy.',
  },
  {
    title: '5. Coach Responsibilities',
    body: 'Coaches are independent service providers and are responsible for the quality and safety of their sessions. Coaches agree to maintain any required certifications, insurance, and to comply with all applicable laws and safeguarding requirements. Clubroom does not employ coaches and is not liable for their actions.',
  },
  {
    title: '6. Prohibited Conduct',
    body: 'You agree not to: use the Service for any unlawful purpose; harass, abuse, or harm other users; create fake or misleading profiles; attempt to circumvent the platform for direct payments; upload harmful or inappropriate content; or interfere with the operation of the Service.',
  },
  {
    title: '7. Intellectual Property',
    body: 'All content, features, and functionality of the Service are owned by Clubroom and are protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.',
  },
  {
    title: '8. Limitation of Liability',
    body: 'To the maximum extent permitted by law, Clubroom shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you to Clubroom in the twelve months preceding the claim.',
  },
  {
    title: '9. Termination',
    body: 'We may terminate or suspend your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service will immediately cease.',
  },
  {
    title: '10. Governing Law',
    body: 'These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
  },
  {
    title: '11. Contact Us',
    body: 'If you have any questions about these Terms, please contact us at legal@clubroom.app.',
  },
];

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentScreen
      title="Terms of Service"
      lastUpdated="1 January 2025"
      sections={TERMS_SECTIONS}
    />
  );
}
