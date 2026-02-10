/**
 * Auth Service Tests
 *
 * Tests for the authService in mock mode: login, register, logout,
 * getCurrentUser, checkAuth, updateProfile, verifyEmail, checkEmailAvailable.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { authService, type RegisterInput } from '../../services/auth-service';

// Helper to create a unique test user
function makeRegisterInput(overrides?: Partial<RegisterInput>): RegisterInput {
  const rand = Math.random().toString(36).substring(2, 10);
  return {
    email: `test_${rand}@example.com`,
    password: 'securePass123',
    accountType: 'COACH',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };
}

describe('AuthService (mock mode)', () => {
  beforeEach(async () => {
    // Ensure clean state: logout removes stored user/tokens
    await authService.logout();
  });

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------

  describe('register', () => {
    test('creates a new user and returns AuthData', async () => {
      const input = makeRegisterInput({ accountType: 'COACH' });
      const result = await authService.register(input);

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.ok(result.data.user, 'Should return user');
      assert.ok(result.data.user.id, 'User should have an ID');
      assert.equal(result.data.user.email, input.email.toLowerCase());
      assert.equal(result.data.user.firstName, 'Test');
      assert.equal(result.data.user.accountType, 'COACH');
      assert.equal(result.data.user.isVerified, false);
      assert.equal(result.data.user.onboardingComplete, false);
      assert.ok(result.data.tokens, 'Should return tokens');
      assert.ok(result.data.tokens?.accessToken, 'Should have accessToken');
      assert.ok(result.data.tokens?.refreshToken, 'Should have refreshToken');
    });

    test('rejects duplicate email', async () => {
      const input = makeRegisterInput();
      const first = await authService.register(input);
      assert.equal(first.success, true);

      const second = await authService.register(input);
      assert.equal(second.success, false);
      if (second.success) return;
      assert.equal(second.error.code, 'CONFLICT');
    });

    test('sets coach-specific fields', async () => {
      const input = makeRegisterInput({
        accountType: 'COACH',
        isOrganization: true,
        organizationName: 'Test Academy',
      });
      const result = await authService.register(input);
      if (!result.success) return;

      assert.equal(result.data.user.accountType, 'COACH');
      assert.equal(result.data.user.isLive, false);
    });

    test('sets currentUser after registration', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const user = await authService.getCurrentUser();
      assert.ok(user, 'getCurrentUser should return the registered user');
      assert.equal(user?.email, input.email.toLowerCase());
    });
  });

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  describe('login', () => {
    test('succeeds with correct credentials', async () => {
      const input = makeRegisterInput();
      await authService.register(input);
      await authService.logout();

      const result = await authService.login(input.email, input.password);
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.user.email, input.email.toLowerCase());
      assert.ok(result.data.tokens, 'Should return tokens');
    });

    test('fails with wrong password', async () => {
      const input = makeRegisterInput();
      await authService.register(input);
      await authService.logout();

      const result = await authService.login(input.email, 'wrongPassword');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'UNAUTHORIZED');
    });

    test('fails with non-existent email', async () => {
      const result = await authService.login('nobody@nowhere.com', 'pass');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'UNAUTHORIZED');
    });

    test('login is case-insensitive for email', async () => {
      const input = makeRegisterInput({ email: 'CamelCase@Test.com' });
      await authService.register(input);
      await authService.logout();

      const result = await authService.login('camelcase@test.com', input.password);
      assert.equal(result.success, true);
    });

    test('does not include password in returned user', async () => {
      const input = makeRegisterInput();
      await authService.register(input);
      await authService.logout();

      const result = await authService.login(input.email, input.password);
      if (!result.success) return;

      const user = result.data.user as unknown as Record<string, unknown>;
      assert.equal(user.password, undefined, 'Password should not be in returned user');
    });
  });

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------

  describe('logout', () => {
    test('clears current user', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      assert.ok(await authService.getCurrentUser(), 'User should be set before logout');

      await authService.logout();

      const user = await authService.getCurrentUser();
      assert.equal(user, null, 'getCurrentUser should return null after logout');
    });

    test('clears tokens', async () => {
      const input = makeRegisterInput();
      await authService.register(input);
      await authService.logout();

      const tokens = await authService.getTokens();
      assert.equal(tokens, null, 'Tokens should be null after logout');
    });

    test('multiple logouts do not throw', async () => {
      await assert.doesNotReject(authService.logout());
      await assert.doesNotReject(authService.logout());
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentUser
  // ---------------------------------------------------------------------------

  describe('getCurrentUser', () => {
    test('returns null when not authenticated', async () => {
      const user = await authService.getCurrentUser();
      assert.equal(user, null);
    });

    test('returns current user after login', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const user = await authService.getCurrentUser();
      assert.ok(user);
      assert.equal(user?.firstName, 'Test');
    });
  });

  // ---------------------------------------------------------------------------
  // checkAuth
  // ---------------------------------------------------------------------------

  describe('checkAuth', () => {
    test('returns not authenticated when no stored data', async () => {
      const state = await authService.checkAuth();
      assert.equal(state.isAuthenticated, false);
      assert.equal(state.user, null);
      assert.equal(state.tokens, null);
    });

    test('returns authenticated after login', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const state = await authService.checkAuth();
      assert.equal(state.isAuthenticated, true);
      assert.ok(state.user);
      assert.ok(state.tokens);
      assert.equal(state.user?.email, input.email.toLowerCase());
    });
  });

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------

  describe('updateProfile', () => {
    test('updates user fields', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const result = await authService.updateProfile({
        firstName: 'Updated',
        city: 'London',
      });

      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.user.firstName, 'Updated');
      assert.equal(result.data.user.city, 'London');
    });

    test('fails when not authenticated', async () => {
      const result = await authService.updateProfile({ firstName: 'Nope' });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'UNAUTHORIZED');
    });

    test('persists changes to getCurrentUser', async () => {
      const input = makeRegisterInput();
      await authService.register(input);
      await authService.updateProfile({ bio: 'Test bio' });

      const user = await authService.getCurrentUser();
      assert.equal(user?.bio, 'Test bio');
    });
  });

  // ---------------------------------------------------------------------------
  // verifyEmail
  // ---------------------------------------------------------------------------

  describe('verifyEmail', () => {
    test('verifies email with valid 6-digit code', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const result = await authService.verifyEmail('123456');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.user.isVerified, true);
    });

    test('rejects invalid code length', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const result = await authService.verifyEmail('123');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('fails when not authenticated', async () => {
      const result = await authService.verifyEmail('123456');
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // checkEmailAvailable
  // ---------------------------------------------------------------------------

  describe('checkEmailAvailable', () => {
    test('returns true for unregistered email', async () => {
      const rand = Math.random().toString(36).substring(2, 10);
      const available = await authService.checkEmailAvailable(`fresh_${rand}@example.com`);
      assert.equal(available, true);
    });

    test('returns false for registered email', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const available = await authService.checkEmailAvailable(input.email);
      assert.equal(available, false);
    });

    test('check is case-insensitive', async () => {
      const input = makeRegisterInput({ email: 'Upper@Test.com' });
      await authService.register(input);

      const available = await authService.checkEmailAvailable('upper@test.com');
      assert.equal(available, false);
    });
  });

  // ---------------------------------------------------------------------------
  // refreshToken
  // ---------------------------------------------------------------------------

  describe('refreshToken', () => {
    test('generates new mock tokens', async () => {
      const input = makeRegisterInput();
      await authService.register(input);

      const oldTokens = await authService.getTokens();
      assert.ok(oldTokens);

      const newTokens = await authService.refreshToken();
      assert.ok(newTokens.accessToken);
      assert.ok(newTokens.refreshToken);
      assert.ok(newTokens.expiresAt > Date.now());
    });
  });

  // ---------------------------------------------------------------------------
  // forgotPassword / requestPasswordReset
  // ---------------------------------------------------------------------------

  describe('forgotPassword', () => {
    test('does not throw for existing or non-existing email', async () => {
      await assert.doesNotReject(authService.forgotPassword('someone@example.com'));
    });
  });

  describe('requestPasswordReset', () => {
    test('returns success', async () => {
      const result = await authService.requestPasswordReset('someone@example.com');
      assert.equal(result.success, true);
    });
  });

  // ---------------------------------------------------------------------------
  // isOnboardingComplete
  // ---------------------------------------------------------------------------

  describe('isOnboardingComplete', () => {
    test('returns false by default', async () => {
      const complete = await authService.isOnboardingComplete();
      assert.equal(complete, false);
    });
  });
});
