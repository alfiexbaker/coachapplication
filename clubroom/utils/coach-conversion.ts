export type CoachConnectionState =
  | 'self'
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'connected';

export interface CoachRelationshipDisplay {
  relationshipLabel: string;
  relationshipIcon: string;
  contactLabel: string;
  contactDetail: string;
  profileSummary: string;
}

export function getCoachRelationshipDisplay(
  state: CoachConnectionState,
  options?: { blocked?: boolean },
): CoachRelationshipDisplay {
  if (options?.blocked) {
    return {
      relationshipLabel: 'Coach blocked',
      relationshipIcon: 'ban-outline',
      contactLabel: 'Contact unavailable',
      contactDetail: 'Messaging and booking stay off while this block is active.',
      profileSummary: 'This coach is blocked, so contact and booking actions are disabled.',
    };
  }

  switch (state) {
    case 'self':
      return {
        relationshipLabel: 'Your profile',
        relationshipIcon: 'person-outline',
        contactLabel: 'Open inbox',
        contactDetail: 'Use your coach inbox to manage incoming enquiries.',
        profileSummary:
          'This profile is your public coaching surface for discovery, contact, and booking.',
      };
    case 'connected':
      return {
        relationshipLabel: 'Connected',
        relationshipIcon: 'checkmark-circle-outline',
        contactLabel: 'Message',
        contactDetail:
          'Open a direct thread when you need to confirm fit, schedule, or session details.',
        profileSummary:
          'You already have a direct connection with this coach. Move into messaging or booking when ready.',
      };
    case 'outgoing_pending':
      return {
        relationshipLabel: 'Request sent',
        relationshipIcon: 'time-outline',
        contactLabel: 'Message',
        contactDetail:
          'Your connection request is pending. You can still message directly about fit, logistics, or availability.',
        profileSummary:
          'This coach is already on your radar. Keep reviewing the profile, message if you need more detail, or move straight to booking.',
      };
    case 'incoming_pending':
      return {
        relationshipLabel: 'Review request',
        relationshipIcon: 'checkmark-circle-outline',
        contactLabel: 'Message',
        contactDetail:
          'Accept the connection request if you want this coach in your network, or message directly about fit and logistics.',
        profileSummary:
          'This coach wants to connect. Review the request, message directly, or book now.',
      };
    case 'none':
    default:
      return {
        relationshipLabel: 'Connect',
        relationshipIcon: 'person-add-outline',
        contactLabel: 'Message',
        contactDetail:
          'Message when you need to check fit, logistics, or availability before booking.',
        profileSummary:
          'Review the profile, connect if you want to keep this coach in your network, and move into messaging or booking when ready.',
      };
  }
}
