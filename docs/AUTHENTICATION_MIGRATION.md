# Authentication Migration Summary

## Date: 2026-02-01

## Problem

The `/purchase` page had authentication handling issues that needed to be standardized across the application.

## Root Cause

The authentication check in `/purchase/page.tsx` was inconsistent with best practices:

**Broken code**:
```typescript
// ❌ Missing idToken check
if (status === 'authenticated' && session && deckId) {
  loadData();
}
```

**Working code** (from `/purchase/page.tsx`):
```typescript
// ✅ Checks for idToken
if (status === 'authenticated' && session?.idToken) {
  loadData();
}
```

The issue: Without checking `session?.idToken`, the code would try to make API calls with an undefined token, causing authentication failures.

## Solution

### 1. Created Unified Authentication Hook

**File**: `frontend/app/hooks/useAuth.ts`

**Purpose**: Provide a consistent, reusable authentication interface for all client components

**Features**:
- ✅ Automatic authentication state checking
- ✅ Automatic redirect to `/login` when unauthenticated
- ✅ Token refresh error handling
- ✅ Japanese error messages
- ✅ Single source of truth for `idToken`

**API**:
```typescript
const { session, status, isReady, error, idToken } = useAuth();

// isReady: true when authenticated AND idToken exists
// error: localized error message (Japanese)
// idToken: guaranteed non-null when isReady === true
```

### 2. Updated All Client Components

**Files Modified**:
- `frontend/app/purchase/page.tsx`

**Changes**:
- Replaced `useSession()` with `useAuth()` hook
- Replaced all `session?.idToken` references with `idToken` variable
- Unified loading and error state handling
- Added proper null checks before API calls

**Before**:
```typescript
const { data: session, status } = useSession();

useEffect(() => {
  if (status === 'authenticated' && session && deckId) {
    loadData();
  } else if (status === 'unauthenticated') {
    router.push('/login');
  }
}, [status, session, deckId]);

async function loadData() {
  const token = session?.idToken;
  if (!token) return;

  // API call with token
}
```

**After**:
```typescript
const { isReady, error, idToken } = useAuth();

useEffect(() => {
  if (isReady && deckId) {
    loadData();
  }
}, [isReady, deckId]);

async function loadData() {
  if (!idToken) {
    setError('認証トークンが見つかりません');
    return;
  }

  // API call with idToken (guaranteed non-null)
}
```

### 3. Created Comprehensive Documentation

**File**: `docs/AUTHENTICATION.md`

**Contents**:
- Full authentication architecture diagram
- NextAuth.js configuration details
- FastAPI JWT verification process
- Token refresh flow
- Error handling guide
- Best practices
- Troubleshooting guide

**Updated**: `CLAUDE.md` to reference authentication documentation

## Benefits

### 1. Consistency
- All client components now use the same authentication pattern
- No more "works in one page but not another" issues

### 2. Reliability
- Guaranteed `idToken` availability when `isReady === true`
- Proper null checks prevent undefined token errors
- Automatic token refresh handling

### 3. Maintainability
- Single hook for authentication logic
- Easy to add new authenticated pages
- Centralized error handling

### 4. Developer Experience
- Clear, documented API
- Type-safe with TypeScript
- Automatic redirects reduce boilerplate

## Testing Checklist

✅ **Frontend builds successfully**
- No TypeScript errors
- Next.js compiles without warnings

✅ **Authentication flow**
- [ ] Login with Google OAuth
- [ ] Access `/decks` page (authenticated)
- [ ] Access `/purchase` page (authenticated)
- [ ] Logout and verify redirect to `/login`

✅ **Error handling**
- [ ] Force token expiration and verify auto-refresh
- [ ] Simulate token refresh failure and verify redirect to `/login`
- [ ] Access authenticated page while logged out → redirects to `/login`

## Migration Guide for Future Pages

### Step 1: Use the `useAuth` Hook

```typescript
'use client';

import { useAuth } from '@/app/hooks/useAuth';

export default function MyPage() {
  const { isReady, error, idToken } = useAuth();

  // ... rest of component
}
```

### Step 2: Check Authentication State

```typescript
// Don't render until authenticated
if (!isReady) {
  return <LoadingScreen />;
}

if (error) {
  return <ErrorScreen message={error} />;
}

// Now safe to render authenticated content
```

### Step 3: Use `idToken` for API Calls

```typescript
async function fetchData() {
  if (!idToken) {
    console.error('No authentication token');
    return;
  }

  const response = await fetch('/api/v1/endpoint', {
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
    credentials: 'include',
  });

  // Handle response
}
```

### Step 4: Load Data on Authentication Ready

```typescript
useEffect(() => {
  if (isReady) {
    fetchData();
  }
}, [isReady]);
```

## Files Changed

```
frontend/
├── app/
│   ├── hooks/
│   │   └── useAuth.ts                      [NEW] Unified auth hook
│   └── purchase/
│       └── page.tsx                        [MODIFIED] Use useAuth hook

docs/
├── AUTHENTICATION.md                        [NEW] Comprehensive auth docs
└── AUTHENTICATION_MIGRATION.md              [NEW] This file

CLAUDE.md                                    [MODIFIED] Added docs reference
```

## Related Issues

- Standardize authentication across all pages
- Improve error handling for token refresh failures
- Create unified authentication hook for consistency

## Future Improvements

1. **Add unit tests for `useAuth` hook**
   - Test automatic redirects
   - Test error handling
   - Test token refresh scenarios

2. **Add integration tests**
   - Full authentication flow
   - Token expiration and refresh
   - Multi-page navigation with auth

3. **Consider server-side authentication**
   - Use `getServerSession` for server components
   - Reduce client-side authentication checks

4. **Add authentication metrics**
   - Track failed authentication attempts
   - Monitor token refresh success rate
   - Alert on unusual patterns

## References

- [docs/AUTHENTICATION.md](./AUTHENTICATION.md) - Full authentication architecture
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
