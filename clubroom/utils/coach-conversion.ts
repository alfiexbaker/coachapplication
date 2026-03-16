export type CoachConnectionState =
  | 'self'
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'following';

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
        profileSummary: 'This profile is your public business surface for discovery and booking.',
      };
    case 'following':
      return {
        relationshipLabel: 'Following',
        relationshipIcon: 'checkmark-circle-outline',
        contactLabel: 'Request contact',
        contactDetail: 'Open a direct thread when you need to ask about fit, schedule, or session details.',
        profileSummary: 'You are already following this coach. Book directly or request contact if you need more detail first.',
      };
    case 'outgoing_pending':
      return {
        relationshipLabel: 'Follow requested',
        relationshipIcon: 'time-outline',
        contactLabel: 'Request contact',
        contactDetail: 'Your follow request is pending. You can still ask a booking question directly.',
        profileSummary: 'This coach is on your radar. Review the profile, request contact if needed, or move straight to booking.',
      };
    case 'incoming_pending':
      return {
        relationshipLabel: 'Review follow',
        relationshipIcon: 'checkmark-circle-outline',
        contactLabel: 'Request contact',
        contactDetail: 'Accept the follow if you want this coach in your feed, or request contact for a direct booking conversation.',
        profileSummary: 'This coach already wants a connection. Accept the follow, request contact, or book now.',
      };
    case 'none':
    default:
      return {
        relationshipLabel: 'Follow coach',
        relationshipIcon: 'person-add-outline',
        contactLabel: 'Request contact',
        contactDetail: 'Use contact when you need to ask about fit, logistics, or availability before booking.',
        profileSummary: 'The clean path is profile first, then follow or save, request contact if needed, and book when ready.',
      };
  }
}
