# Navigation Testing Guide

**Purpose:** Verify that navigation works correctly for all user roles after the admin segmentation fix.

---

## What Was Fixed

### Issue:
Tab icons were not displaying (showing as empty/default icons).

### Root Cause:
Icon names used in admin tabs (`person.2.fill`, `exclamationmark.triangle.fill`, `gearshape.fill`) were not mapped in the `IconSymbol` component.

### Solution:
1. Added missing icon mappings to `components/ui/icon-symbol.tsx`:
   - `person.2.fill` → `group` (Material Icons)
   - `exclamationmark.triangle.fill` → `warning`
   - `gearshape.fill` → `settings`

2. Added debug logging to track:
   - Current user and role
   - Which tab group is rendering
   - Login/logout events

---

## Debug Logs to Monitor

When testing, open the browser console (Safari Web Inspector) and look for these logs:

### Auth Logs:
```
[Auth] Login attempt: user
[Auth] Login successful: user Role: User
[Auth] Logout: user
```

### Tab Layout Logs:
```
[TabLayout] Current user: user Role: User
[TabLayout] Role flags: { isCoach: false, isUser: true, isAdmin: false }
[TabLayout] Rendering USER/PARENT tabs
```

### Warning Log (if something is wrong):
```
[TabLayout] WARNING: No role matched! Tabs may not render correctly
```

---

## Testing Steps

### 1. Test User Role
**Login:** username: `user`, password: `user1234`

**Expected Console Output:**
```
[Auth] Login attempt: user
[Auth] Login successful: user Role: User
[TabLayout] Current user: user Role: User
[TabLayout] Role flags: { isCoach: false, isUser: true, isAdmin: false }
[TabLayout] Rendering USER/PARENT tabs
```

**Expected Tabs (Bottom Bar):**
- ✅ Discover (map icon)
- ✅ Bookings (calendar icon)
- ✅ Messages (chat bubble icon)
- ✅ Profile (person icon)

**Should NOT see:**
- ❌ Calendar tab
- ❌ Users tab
- ❌ Reports tab

---

### 2. Test Parent Role
**Login:** username: `parent`, password: `parent1234`

**Expected Console Output:**
```
[Auth] Login attempt: parent
[Auth] Login successful: parent Role: Parent
[TabLayout] Current user: parent Role: Parent
[TabLayout] Role flags: { isCoach: false, isUser: true, isAdmin: false }
[TabLayout] Rendering USER/PARENT tabs
```

**Expected Tabs (Bottom Bar):**
- ✅ Discover (map icon)
- ✅ Bookings (calendar icon)
- ✅ Messages (chat bubble icon)
- ✅ Profile (person icon)

**Notes:** Same as User (Parent and User are treated identically).

---

### 3. Test Coach Role
**Login:** username: `coach`, password: `coach1234`

**Expected Console Output:**
```
[Auth] Login attempt: coach
[Auth] Login successful: coach Role: Coach
[TabLayout] Current user: coach Role: Coach
[TabLayout] Role flags: { isCoach: true, isUser: false, isAdmin: false }
[TabLayout] Rendering COACH tabs
```

**Expected Tabs (Bottom Bar):**
- ✅ Calendar (calendar icon) - Coach's availability
- ✅ Bookings (calendar with clock icon)
- ✅ Messages (chat bubble icon)
- ✅ Profile (person icon)

**Should NOT see:**
- ❌ Discover tab
- ❌ Users tab
- ❌ Reports tab

---

### 4. Test Admin Role
**Login:** username: `admin`, password: `admin1234`

**Expected Console Output:**
```
[Auth] Login attempt: admin
[Auth] Login successful: admin Role: Admin
[TabLayout] Current user: admin Role: Admin
[TabLayout] Role flags: { isCoach: false, isUser: false, isAdmin: true }
[TabLayout] Rendering ADMIN tabs
```

**Expected Tabs (Bottom Bar):**
- ✅ Users (group icon) - User management
- ✅ Bookings (calendar with clock icon) - Platform bookings
- ✅ Reports (warning triangle icon) - Content moderation
- ✅ Settings (gear icon) - Platform settings

**Should NOT see:**
- ❌ Discover tab
- ❌ Calendar tab
- ❌ Messages tab
- ❌ Profile tab

---

## Common Issues and Troubleshooting

### Issue: Icons not showing
**Check:**
1. Look for TypeScript errors in console related to IconSymbol
2. Verify icon names in `components/ui/icon-symbol.tsx` MAPPING object
3. Check if Material Icons package is installed: `@expo/vector-icons`

**Fix:**
```bash
cd clubroom
npm install @expo/vector-icons
```

---

### Issue: Wrong tabs showing for role
**Check:**
1. Console logs: What role is detected?
2. Console logs: Which tab group is rendering?
3. Are you logged in correctly?

**Debug:**
- Look at console output for role flags
- If you see `WARNING: No role matched!`, the role detection is broken
- Verify `currentUser?.role` matches one of: 'User', 'Parent', 'Coach', 'Admin'

---

### Issue: No tabs at all
**Possible causes:**
1. Not logged in (currentUser is null)
2. Role doesn't match any condition
3. React rendering error

**Check console for:**
```
[TabLayout] Current user: undefined Role: undefined
[TabLayout] WARNING: No role matched!
```

**Fix:** Make sure you're logged in before accessing the tabs.

---

## Icon Reference

**All icons now mapped:**
- `map.fill` → explore (Discover)
- `calendar` → event (Calendar)
- `calendar.badge.clock` → schedule (Bookings)
- `bubble.left.and.bubble.right.fill` → chat-bubble (Messages)
- `person.circle.fill` → account-circle (Profile)
- `person.2.fill` → group (Users - Admin)
- `exclamationmark.triangle.fill` → warning (Reports - Admin)
- `gearshape.fill` → settings (Settings - Admin)

---

## Next Steps After Testing

If all roles show correct tabs with correct icons:
1. ✅ Navigation fix is complete
2. ✅ Remove debug logs (or keep for development)
3. ✅ Move on to Sprint 1 tasks

If issues persist:
1. Share console logs
2. Share screenshot of tab bar
3. Identify which role is failing
4. Check auth state in React DevTools

---

## Verification Checklist

- [ ] User role shows 4 tabs with correct icons
- [ ] Parent role shows 4 tabs with correct icons
- [ ] Coach role shows 4 tabs with correct icons
- [ ] Admin role shows 4 tabs with correct icons
- [ ] No TypeScript errors in console
- [ ] No icon rendering errors
- [ ] Console logs show correct role detection
- [ ] Switching between roles updates tabs correctly
- [ ] Logging out clears currentUser
- [ ] Logging back in restores correct tabs

---

**All tests passing = Navigation system is working correctly!** 🎉
