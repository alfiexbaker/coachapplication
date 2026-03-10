import { LegalDocumentScreen, type LegalDocumentSection } from '@/components/settings/legal-document-screen';

const PRIVACY_POLICY_SECTIONS: LegalDocumentSection[] = [
  {
    title: '1. Introduction',
    body: 'Clubroom ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service"). Please read this policy carefully.',
  },
  {
    title: '2. Information We Collect',
    body: 'We collect information you provide directly, including: your name, email address, phone number, and profile information; billing references and payment instructions shared in the app; child information provided by parents or guardians; coaching qualifications and verification documents; messages and communications within the platform; session feedback and reviews.',
  },
  {
    title: '3. How We Use Your Information',
    body: 'We use the information we collect to: provide and maintain the Service; manage bookings, invoicing, and payment tracking; facilitate communication between parents and coaches; verify coach identities and qualifications; send notifications about bookings and updates; improve and personalise your experience; comply with legal obligations and safeguarding requirements.',
  },
  {
    title: '4. Data Sharing',
    body: 'We may share your information with: coaches, organizations, or parents as necessary to facilitate bookings and payment coordination; service providers who assist in operating the platform; law enforcement or regulatory bodies when required by law; other parties with your explicit consent. We do not sell your personal information to third parties.',
  },
  {
    title: "5. Children's Privacy",
    body: 'Clubroom takes the privacy of children seriously. Child profiles are created and managed by parents or guardians. We collect only the minimum information necessary to facilitate coaching sessions, including medical and emergency contact details for safety purposes. This information is shared only with confirmed coaches for active bookings.',
  },
  {
    title: '6. Data Security',
    body: 'We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.',
  },
  {
    title: '7. Data Retention',
    body: 'We retain your personal data for as long as your account is active or as needed to provide you with the Service. We may retain certain information as required by law or for legitimate business purposes, such as resolving disputes and enforcing our agreements.',
  },
  {
    title: '8. Your Rights',
    body: 'Under applicable data protection laws, you have the right to: access your personal data; correct inaccurate data; request deletion of your data; object to or restrict processing; data portability; withdraw consent at any time. To exercise these rights, please contact us at privacy@clubroom.app.',
  },
  {
    title: '9. Cookies and Analytics',
    body: 'We may use analytics tools to understand how the Service is used. These tools may collect information such as device type, operating system, usage patterns, and crash reports. This information is used solely to improve the Service and is not used for advertising purposes.',
  },
  {
    title: '10. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy within the app and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.',
  },
  {
    title: '11. Contact Us',
    body: 'If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@clubroom.app.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen
      title="Privacy Policy"
      lastUpdated="1 January 2025"
      sections={PRIVACY_POLICY_SECTIONS}
    />
  );
}
