"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const storage_keys_1 = require("@/constants/storage-keys");
const poc_accounts_1 = require("@/constants/poc-accounts");
const api_client_1 = require("@/services/api-client");
const community_carpool_service_1 = require("@/services/community/community-carpool-service");
function expectOk(result) {
    if (result.success) {
        return result.data;
    }
    strict_1.default.fail(`Expected ok() result, got error: ${result.error.code}`);
}
function expectErr(result) {
    if (!result.success) {
        return result.error;
    }
    strict_1.default.fail('Expected err() result, got ok()');
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('communityCarpoolService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS);
    });
    (0, node_test_1.it)('creates carpool offer with ACTIVE status and zero seats taken', async () => {
        const created = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 3,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: true,
            returnTime: '11:00',
        }));
        strict_1.default.ok(created.id.length > 0);
        strict_1.default.equal(created.status, 'ACTIVE');
        strict_1.default.equal(created.seatsTaken, 0);
        strict_1.default.equal(created.requests.length, 0);
    });
    (0, node_test_1.it)('rejects invalid offer input when no seats are available', async () => {
        const error = expectErr(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 0,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        strict_1.default.equal(error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('returns session offers as Result and includes newly created offer', async () => {
        const sessionId = nextId('session');
        const created = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId,
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 2,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        const offers = expectOk(await community_carpool_service_1.communityCarpoolService.getCarpoolOffers(sessionId));
        strict_1.default.ok(offers.some((offer) => offer.id === created.id));
    });
    (0, node_test_1.it)('accepts request and updates seats and offer status to FULL when capacity reached', async () => {
        const offer = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 1,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        const request = expectOk(await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
            offerId: offer.id,
            parentId: nextId('parent'),
            parentName: 'Parent B',
            childNames: ['Child B'],
            seatsRequested: 1,
        }));
        expectOk(await community_carpool_service_1.communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));
        const updatedOffer = expectOk(await community_carpool_service_1.communityCarpoolService.getCarpoolOffer(offer.id));
        const acceptedRequest = updatedOffer.requests.find((item) => item.id === request.id);
        strict_1.default.equal(updatedOffer.seatsTaken, 1);
        strict_1.default.equal(updatedOffer.status, 'FULL');
        strict_1.default.equal(acceptedRequest?.status, 'ACCEPTED');
    });
    (0, node_test_1.it)('declines request and keeps it in request list as DECLINED', async () => {
        const offer = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 2,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        const request = expectOk(await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
            offerId: offer.id,
            parentId: nextId('parent'),
            parentName: 'Parent B',
            childNames: ['Child B'],
            seatsRequested: 1,
        }));
        expectOk(await community_carpool_service_1.communityCarpoolService.declineCarpoolRequest(offer.id, request.id));
        const updatedOffer = expectOk(await community_carpool_service_1.communityCarpoolService.getCarpoolOffer(offer.id));
        const declinedRequest = updatedOffer.requests.find((item) => item.id === request.id);
        strict_1.default.equal(declinedRequest?.status, 'DECLINED');
    });
    (0, node_test_1.it)('rejects cancellation when caller is not the offer owner', async () => {
        const offer = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: nextId('parent'),
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 2,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        const error = expectErr(await community_carpool_service_1.communityCarpoolService.cancelCarpoolOffer(offer.id, nextId('parent')));
        strict_1.default.equal(error.code, 'UNAUTHORIZED');
    });
    (0, node_test_1.it)('cancels an accepted request and frees up the taken seat', async () => {
        const ownerId = nextId('parent');
        const requesterId = nextId('parent');
        const offer = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: ownerId,
            parentName: 'Parent A',
            sessionId: nextId('session'),
            sessionName: 'Saturday Training',
            sessionDate: '2026-03-01',
            seatsAvailable: 1,
            pickupLocation: 'North Gate',
            pickupTime: '09:00',
            returnOffered: false,
        }));
        const request = expectOk(await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
            offerId: offer.id,
            parentId: requesterId,
            parentName: 'Parent B',
            childNames: ['Child B'],
            seatsRequested: 1,
        }));
        expectOk(await community_carpool_service_1.communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));
        expectOk(await community_carpool_service_1.communityCarpoolService.cancelCarpoolRequest(offer.id, request.id, requesterId));
        const updatedOffer = expectOk(await community_carpool_service_1.communityCarpoolService.getCarpoolOffer(offer.id));
        const cancelledRequest = updatedOffer.requests.find((item) => item.id === request.id);
        strict_1.default.equal(updatedOffer.seatsTaken, 0);
        strict_1.default.equal(updatedOffer.status, 'ACTIVE');
        strict_1.default.equal(cancelledRequest?.status, 'CANCELLED');
    });
    (0, node_test_1.it)('supports canonical account aliases in owner/requester authorization', async () => {
        const offer = expectOk(await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
            parentId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
            parentName: 'Coach Alias',
            sessionId: nextId('session'),
            sessionName: 'Sunday Session',
            sessionDate: '2026-03-08',
            seatsAvailable: 1,
            pickupLocation: 'South Gate',
            pickupTime: '10:00',
            returnOffered: false,
        }));
        const request = expectOk(await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
            offerId: offer.id,
            parentId: poc_accounts_1.POC_ACCOUNT_IDS.athleteStorage,
            parentName: 'Athlete Alias',
            childNames: ['Alias Child'],
            seatsRequested: 1,
        }));
        expectOk(await community_carpool_service_1.communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));
        expectOk(await community_carpool_service_1.communityCarpoolService.cancelCarpoolOffer(offer.id, poc_accounts_1.POC_ACCOUNT_IDS.coach));
        expectOk(await community_carpool_service_1.communityCarpoolService.cancelCarpoolRequest(offer.id, request.id, poc_accounts_1.POC_ACCOUNT_IDS.athlete));
    });
});
