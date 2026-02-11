"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("./event-bus");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('VerificationService');
// Default verification status for a new coach
const createDefaultVerificationStatus = (coachId) => ({
    coachId,
    email: {
        status: 'VERIFIED',
        verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    phone: {
        status: 'VERIFIED',
        verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    identity: {
        status: 'NOT_STARTED',
    },
    backgroundCheck: {
        status: 'NOT_STARTED',
    },
    credentials: [],
    insurance: {
        status: 'NOT_STARTED',
    },
    overallLevel: 'BASIC',
    lastUpdated: new Date().toISOString(),
});
// Mock verification statuses for demo purposes
const MOCK_VERIFICATION_STATUSES = {
    coach1: {
        coachId: 'coach1',
        email: {
            status: 'VERIFIED',
            verifiedAt: '2024-01-15T10:00:00Z',
        },
        phone: {
            status: 'VERIFIED',
            verifiedAt: '2024-01-15T10:05:00Z',
        },
        identity: {
            status: 'VERIFIED',
            verifiedAt: '2024-01-20T14:30:00Z',
            documentUrl: 'mock://id-document-1.jpg',
        },
        backgroundCheck: {
            status: 'VERIFIED',
            verifiedAt: '2024-02-01T09:00:00Z',
            expiresAt: '2027-02-01T09:00:00Z',
            notes: 'Enhanced DBS check completed',
        },
        credentials: [
            {
                status: 'VERIFIED',
                verifiedAt: '2024-01-25T11:00:00Z',
                expiresAt: '2026-01-25T11:00:00Z',
                documentUrl: 'mock://fa-badge-level2.pdf',
                notes: 'FA Level 2 Coaching Badge',
            },
            {
                status: 'VERIFIED',
                verifiedAt: '2024-01-25T11:30:00Z',
                expiresAt: '2025-01-25T11:30:00Z',
                documentUrl: 'mock://first-aid.pdf',
                notes: 'Emergency First Aid Certificate',
            },
        ],
        insurance: {
            status: 'VERIFIED',
            verifiedAt: '2024-01-10T08:00:00Z',
            expiresAt: '2025-01-10T08:00:00Z',
            notes: 'Public Liability Insurance - £5M',
        },
        overallLevel: 'PREMIUM',
        lastUpdated: '2024-02-01T09:00:00Z',
    },
    coach2: {
        coachId: 'coach2',
        email: {
            status: 'VERIFIED',
            verifiedAt: '2024-03-01T10:00:00Z',
        },
        phone: {
            status: 'VERIFIED',
            verifiedAt: '2024-03-01T10:05:00Z',
        },
        identity: {
            status: 'PENDING',
            documentUrl: 'mock://id-document-2.jpg',
            notes: 'Under review',
        },
        backgroundCheck: {
            status: 'NOT_STARTED',
        },
        credentials: [
            {
                status: 'PENDING',
                documentUrl: 'mock://coaching-cert.pdf',
                notes: 'FA Level 1 Badge - awaiting verification',
            },
        ],
        insurance: {
            status: 'NOT_STARTED',
        },
        overallLevel: 'BASIC',
        lastUpdated: '2024-03-05T14:00:00Z',
    },
};
class VerificationService {
    /**
     * Get verification status for a coach
     */
    async getStatus(coachId) {
        try {
            const allStatuses = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.VERIFICATION, MOCK_VERIFICATION_STATUSES);
            return (0, result_1.ok)(allStatuses[coachId] ?? createDefaultVerificationStatus(coachId));
        }
        catch (error) {
            logger.error('Failed to get verification status', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load verification status'));
        }
    }
    /**
     * Update a specific verification item
     */
    async updateVerificationItem(coachId, field, update) {
        try {
            const allStatuses = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.VERIFICATION, MOCK_VERIFICATION_STATUSES);
            const currentStatus = allStatuses[coachId] ?? createDefaultVerificationStatus(coachId);
            const updatedStatus = {
                ...currentStatus,
                [field]: {
                    ...currentStatus[field],
                    ...update,
                },
                lastUpdated: new Date().toISOString(),
            };
            // Recalculate overall level
            updatedStatus.overallLevel = this.calculateOverallLevel(updatedStatus);
            allStatuses[coachId] = updatedStatus;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.VERIFICATION, allStatuses);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.VERIFICATION_UPDATED, {
                coachId,
                field,
                status: updatedStatus[field].status,
                overallLevel: updatedStatus.overallLevel,
                lastUpdated: updatedStatus.lastUpdated,
            });
            return (0, result_1.ok)(updatedStatus);
        }
        catch (error) {
            logger.error('Failed to update verification item', { coachId, field, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update verification'));
        }
    }
    /**
     * Add or update a credential
     */
    async addCredential(coachId, credential) {
        try {
            const allStatuses = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.VERIFICATION, MOCK_VERIFICATION_STATUSES);
            const currentStatus = allStatuses[coachId] ?? createDefaultVerificationStatus(coachId);
            const updatedStatus = {
                ...currentStatus,
                credentials: [...currentStatus.credentials, credential],
                lastUpdated: new Date().toISOString(),
            };
            updatedStatus.overallLevel = this.calculateOverallLevel(updatedStatus);
            allStatuses[coachId] = updatedStatus;
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.VERIFICATION, allStatuses);
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.VERIFICATION_UPDATED, {
                coachId,
                field: 'credentials',
                status: credential.status,
                overallLevel: updatedStatus.overallLevel,
                lastUpdated: updatedStatus.lastUpdated,
            });
            return (0, result_1.ok)(updatedStatus);
        }
        catch (error) {
            logger.error('Failed to add credential', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to add credential'));
        }
    }
    /**
     * Submit ID for verification (mock - immediately sets to PENDING)
     */
    async submitIdVerification(coachId, documentUrl) {
        return this.updateVerificationItem(coachId, 'identity', {
            status: 'PENDING',
            documentUrl,
            notes: 'Document submitted, awaiting review',
        });
    }
    /**
     * Start background check process (mock - immediately sets to PENDING)
     */
    async startBackgroundCheck(coachId) {
        return this.updateVerificationItem(coachId, 'backgroundCheck', {
            status: 'PENDING',
            notes: 'Background check initiated',
        });
    }
    /**
     * Submit a credential for verification
     */
    async submitCredential(coachId, documentUrl, notes) {
        return this.addCredential(coachId, {
            status: 'PENDING',
            documentUrl,
            notes,
        });
    }
    /**
     * Mock: Approve a pending verification (for demo/testing)
     */
    async mockApproveVerification(coachId, field) {
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 3);
        return this.updateVerificationItem(coachId, field, {
            status: 'VERIFIED',
            verifiedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
        });
    }
    /**
     * Calculate overall verification level based on individual items
     */
    calculateOverallLevel(status) {
        const emailVerified = status.email.status === 'VERIFIED';
        const phoneVerified = status.phone.status === 'VERIFIED';
        const identityVerified = status.identity.status === 'VERIFIED';
        const backgroundVerified = status.backgroundCheck.status === 'VERIFIED';
        const hasVerifiedCredentials = status.credentials.some((c) => c.status === 'VERIFIED');
        const insuranceVerified = status.insurance.status === 'VERIFIED';
        // PREMIUM: All verified
        if (emailVerified &&
            phoneVerified &&
            identityVerified &&
            backgroundVerified &&
            hasVerifiedCredentials &&
            insuranceVerified) {
            return 'PREMIUM';
        }
        // VERIFIED: Email, phone, identity, and background check
        if (emailVerified && phoneVerified && identityVerified && backgroundVerified) {
            return 'VERIFIED';
        }
        // BASIC: Email and phone verified
        if (emailVerified && phoneVerified) {
            return 'BASIC';
        }
        return 'NONE';
    }
    /**
     * Get verification progress percentage
     */
    getProgressPercentage(status) {
        let completed = 0;
        const total = 6; // email, phone, identity, background, credentials, insurance
        if (status.email.status === 'VERIFIED')
            completed++;
        if (status.phone.status === 'VERIFIED')
            completed++;
        if (status.identity.status === 'VERIFIED')
            completed++;
        if (status.backgroundCheck.status === 'VERIFIED')
            completed++;
        if (status.credentials.some((c) => c.status === 'VERIFIED'))
            completed++;
        if (status.insurance.status === 'VERIFIED')
            completed++;
        return Math.round((completed / total) * 100);
    }
    /**
     * Get status label for display
     */
    getStatusLabel(item) {
        switch (item.status) {
            case 'NOT_STARTED':
                return 'Not started';
            case 'PENDING':
                return 'Under review';
            case 'VERIFIED':
                return 'Verified';
            case 'FAILED':
                return 'Failed';
            case 'EXPIRED':
                return 'Expired';
            default:
                return 'Unknown';
        }
    }
    /**
     * Get status color tone for badges
     */
    getStatusTone(status) {
        switch (status) {
            case 'VERIFIED':
                return 'success';
            case 'PENDING':
                return 'warning';
            case 'FAILED':
            case 'EXPIRED':
                return 'default';
            default:
                return 'default';
        }
    }
}
exports.verificationService = new VerificationService();
