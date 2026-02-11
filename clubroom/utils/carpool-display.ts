import type { CarpoolOffer, CarpoolRequest } from '@/constants/types';

export function getCarpoolSessionLabel(offer: CarpoolOffer): string {
  return offer.sessionId || 'Session';
}

export function getCarpoolOfferParentLabel(offer: CarpoolOffer): string {
  return offer.parentId || 'Parent';
}

export function getCarpoolRequestParentLabel(request: CarpoolRequest): string {
  return request.parentId || 'Parent';
}
