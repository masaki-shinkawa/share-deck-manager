# Authentication Architecture

## Overview

Share Deck Manager uses **Google OAuth 2.0** for authentication with **JWT (JSON Web Tokens)** for stateless session management. The authentication flow is handled by **NextAuth.js** on the frontend and verified by **FastAPI** on the backend.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
└─────────────────────────────────────────────────────────────────┘

1. User Login (Google OAuth)
   ┌─────────┐      ┌──────────────┐      ┌──────────────┐
   │ Browser │─────>│ NextAuth.js  │─────>│ Google OAuth │
   │         │      │ (Frontend)   │      │              │
   └─────────┘      └──────────────┘      └──────────────┘
        │                   ↓                      ↓
        │            JWT Token                  ID Token
        │            Issued &                   Returned
        │            Stored
        └───────────────────┘

2. API Request with Authentication
   ┌─────────┐      ┌──────────────┐      ┌──────────────┐
   │ Browser │─────>│ Next.js      │─────>│ FastAPI      │
   │         │      │ (idToken)    │      │ Backend      │
   └─────────┘      └──────────────┘      └──────────────┘
        │                   │                      │
    Cookie             Authorization           Verify JWT
   (session)            Bearer {token}         (RS256)
        │                   │                      │
        └───────────────────┴──────────────────────┘
                            ↓
                    Google Public Keys
                    (Cached, 1 hour TTL)
```

## Components

### 1. Frontend Authentication (NextAuth.js)

**Location**: `frontend/app/api/auth/[...nextauth]/route.ts`

**Configuration**:
```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",  // Stateless JWT sessions
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Store Google ID token in JWT
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,        // ← Google ID Token
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at * 1000,
        }
      }

      // Auto-refresh expired tokens
      if (Date.now() < token.accessTokenExpires) {
        return token
      }

      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.idToken = token.idToken      // ← Expose to client
      session.error = token.error
      return session
    },
  },
}
```

**Key Features**:
- **JWT Strategy**: Stateless sessions (no database storage required)
- **Automatic Token Refresh**: Google tokens auto-refresh before expiration
- **Error Handling**: `RefreshAccessTokenError` triggers re-authentication

---

### 2. Unified Authentication Hook

**Location**: `frontend/app/hooks/useAuth.ts`

**Purpose**: Standardize authentication logic across all client components

**Usage Example**:
```typescript
import { useAuth } from '@/app/hooks/useAuth';

export default function MyPage() {
  const { session, status, isReady, error, idToken } = useAuth();

  // Automatic redirects:
  // - status === 'unauthenticated' → /login
  // - error === 'RefreshAccessTokenError' → /login

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  // Use idToken for API calls
  const data = await api.fetch(idToken);

  return <div>Authenticated content</div>;
}
```

**Return Values**:
```typescript
interface UseAuthReturn {
  session: Session | null;           // NextAuth session object
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isReady: boolean;                   // true when authenticated + idToken exists
  error: string | null;               // Localized error message (Japanese)
  idToken: string | null;             // Google ID token for API authentication
}
```

**Benefits**:
- ✅ Consistent authentication checks
- ✅ Automatic redirect to `/login` when unauthenticated
- ✅ Error handling with user-friendly messages (Japanese)
- ✅ Single source of truth for authentication state

---

### 3. Backend Authentication (FastAPI)

**Location**: `backend/app/core/security.py`

**Token Verification Process**:
```python
async def verify_token(credentials: HTTPAuthorizationCredentials):
    """
    Verify Google ID token (RS256)

    Steps:
    1. Extract token from Authorization header
    2. Get key ID (kid) from token header
    3. Fetch Google public keys (cached 1 hour)
    4. Verify token signature using RS256 algorithm
    5. Validate audience, issuer, expiration
    6. Return payload with user info (google_id in 'sub' field)
    """
    token = credentials.credentials

    try:
        # Extract key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Get Google public key (cached)
        public_key = get_google_public_key(kid)

        # Verify token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            issuer="https://accounts.google.com",
        )

        return payload  # Contains: sub (google_id), email, name, etc.

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
```

**Google Public Key Caching**:
```python
# Cache for 1 hour to reduce API calls to Google
_google_keys_cache = TTLCache(maxsize=10, ttl=3600)

def get_google_public_keys():
    """Fetch Google's public keys with caching"""
    if "keys" not in _google_keys_cache:
        response = requests.get("https://www.googleapis.com/oauth2/v3/certs")
        certs = response.json()
        _google_keys_cache["keys"] = certs["keys"]
    return _google_keys_cache["keys"]
```

---

### 4. User Dependency Injection

**Location**: `backend/app/core/dependencies.py`

**Purpose**: Convert JWT payload to User object

```python
async def get_current_user(
    payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Dependency to get the current authenticated user.

    Flow:
    1. verify_token() validates JWT and returns payload
    2. Extract google_id from payload['sub']
    3. Query database for User by google_id
    4. Return User object or raise 404
    """
    google_id = payload.get("sub")

    if not google_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing subject")

    result = await session.execute(
        select(User).where(User.google_id == google_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
```

**Usage in Endpoints**:
```python
from app.core.dependencies import get_current_user

@router.get("/api/v1/decks")
async def list_decks(
    user: User = Depends(get_current_user),  # ← Automatic auth check
    session: AsyncSession = Depends(get_session)
):
    """List all decks for the authenticated user"""
    result = await session.execute(
        select(Deck).where(Deck.user_id == user.id)
    )
    return result.scalars().all()
```

---

## Authentication Flow

### Initial Login

```
1. User clicks "Sign in with Google"
   ↓
2. NextAuth redirects to Google OAuth consent screen
   ↓
3. User approves permissions
   ↓
4. Google redirects back with authorization code
   ↓
5. NextAuth exchanges code for tokens:
   - access_token (for Google APIs)
   - id_token (JWT signed by Google, contains user info)
   - refresh_token (for token renewal)
   ↓
6. NextAuth stores tokens in JWT session (cookie: session-token)
   ↓
7. User redirected to /decks
```

### Authenticated API Request

```
1. Client component uses useAuth() hook
   ↓
2. Extract idToken from session: const { idToken } = useAuth()
   ↓
3. Make API request with Authorization header:
   fetch('/api/v1/decks', {
     headers: {
       'Authorization': `Bearer ${idToken}`
     }
   })
   ↓
4. FastAPI receives request
   ↓
5. verify_token() extracts and validates JWT:
   - Check signature with Google public key (RS256)
   - Verify audience (GOOGLE_CLIENT_ID)
   - Verify issuer (accounts.google.com)
   - Check expiration
   ↓
6. get_current_user() looks up User in database by google_id
   ↓
7. Endpoint handler receives User object
   ↓
8. Response sent back to client
```

### Token Refresh

```
1. NextAuth detects token expiration (expires_at < now)
   ↓
2. refreshAccessToken() called automatically:
   POST https://oauth2.googleapis.com/token
   Body: {
     client_id, client_secret, grant_type: "refresh_token",
     refresh_token: <stored_refresh_token>
   }
   ↓
3. Google returns new tokens:
   - new access_token
   - new id_token
   - (optionally) new refresh_token
   ↓
4. NextAuth updates JWT session with new tokens
   ↓
5. If refresh fails:
   - Set session.error = "RefreshAccessTokenError"
   - useAuth() hook redirects to /login
```

---

## Security Features

### 1. Token Validation (Backend)

| Check | Purpose |
|-------|---------|
| **Signature (RS256)** | Verify token was issued by Google (not tampered) |
| **Audience** | Ensure token is for this application (`GOOGLE_CLIENT_ID`) |
| **Issuer** | Confirm token is from `https://accounts.google.com` |
| **Expiration** | Reject expired tokens |
| **Key ID (kid)** | Use correct public key from Google's key rotation |

### 2. Google Public Key Caching

- **Why?** Reduce latency and API calls to Google
- **TTL**: 1 hour (Google rotates keys infrequently)
- **Thread-safe**: RLock for concurrent requests
- **Fallback**: Re-fetch on cache miss

### 3. CORS Configuration

**Backend** (`backend/app/main.py`):
```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # ← Required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Environment Variables**:
```bash
# Development
ALLOWED_ORIGINS=http://localhost:3000

# Production (Railway)
ALLOWED_ORIGINS=https://share-deck-manager-frontend-production.up.railway.app
```

### 4. Credentials in Requests

**Frontend API Client**:
```typescript
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${idToken}`,
  },
  credentials: 'include',  // ← Send cookies (NextAuth session)
});
```

---

## Error Handling

### Frontend Errors

| Error | Trigger | Action |
|-------|---------|--------|
| `status === 'unauthenticated'` | No session | Redirect to `/login` |
| `session.error === 'RefreshAccessTokenError'` | Token refresh failed | Show error + redirect to `/login` |
| `!session.idToken` | Missing ID token | Show error + redirect to `/login` |

**User-Facing Messages** (Japanese):
```typescript
const errors = {
  tokenRefreshFailed: 'セッションの更新に失敗しました。再度ログインしてください。',
  tokenMissing: '認証トークンが見つかりません。再度ログインしてください。',
};
```

### Backend Errors

| HTTP Code | Reason | Response |
|-----------|--------|----------|
| **401 Unauthorized** | Invalid/expired token | `{"detail": "Invalid token: ..."}` |
| **404 Not Found** | User not in database | `{"detail": "User not found"}` |

---

## Environment Variables

### Required for Authentication

**Frontend** (`.env.local`):
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate_with_openssl_rand_base64_32>

# Google OAuth
GOOGLE_CLIENT_ID=<your_google_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Backend** (`.env`):
```bash
# Google OAuth (same as frontend)
GOOGLE_CLIENT_ID=<your_google_client_id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/deck_manager_dev
```

---

## Best Practices

### 1. Always Use `useAuth()` Hook in Client Components

❌ **Bad** (Direct useSession):
```typescript
const { data: session, status } = useSession();
const token = session?.idToken;

if (status === 'loading') return <Loading />;
if (status === 'unauthenticated') router.push('/login');
if (!token) return <Error />;
```

✅ **Good** (useAuth hook):
```typescript
const { isReady, error, idToken } = useAuth();

if (!isReady) return <Loading />;
if (error) return <Error message={error} />;

// idToken is guaranteed to be non-null here
```

### 2. Check `idToken` Before API Calls

❌ **Bad**:
```typescript
async function fetchData() {
  const response = await fetch('/api/v1/decks', {
    headers: { 'Authorization': `Bearer ${session?.idToken}` }
  });
}
```

✅ **Good**:
```typescript
async function fetchData() {
  if (!idToken) {
    setError('認証トークンがありません');
    return;
  }

  const response = await fetch('/api/v1/decks', {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
}
```

### 3. Use Dependency Injection in Backend

❌ **Bad** (Manual token parsing):
```python
@router.get("/api/v1/decks")
async def list_decks(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    payload = verify_token_manually(token)
    user = await get_user_by_google_id(payload["sub"])
    # ...
```

✅ **Good** (Dependency injection):
```python
@router.get("/api/v1/decks")
async def list_decks(
    user: User = Depends(get_current_user)  # ← Handles everything
):
    # user is already validated
```

### 4. Handle Token Refresh Errors

```typescript
// useAuth hook handles this automatically
useEffect(() => {
  if (session?.error === 'RefreshAccessTokenError') {
    console.error('Session refresh failed. Redirecting to login...');
    router.push('/login');
  }
}, [session?.error, router]);
```

---

## Testing Authentication

### Manual Testing

1. **Login Flow**:
   ```bash
   # Start frontend
   cd frontend && npm run dev

   # Open http://localhost:3000/login
   # Click "Sign in with Google"
   # Approve permissions
   # Should redirect to /decks
   ```

2. **Token Inspection** (Browser DevTools):
   ```javascript
   // Console
   const session = await fetch('/api/auth/session').then(r => r.json());
   console.log(session.idToken);  // Should see JWT
   ```

3. **Backend Verification**:
   ```bash
   # Copy idToken from browser
   curl -H "Authorization: Bearer <idToken>" http://localhost:3000/api/v1/decks
   ```

### Unit Testing (Backend)

```python
# tests/core/test_dependencies.py
import pytest
from app.core.dependencies import get_current_user

@pytest.mark.asyncio
async def test_get_current_user_success(session, mock_google_token):
    """Test successful user authentication"""
    payload = {"sub": "google_user_id_123"}
    user = await get_current_user(payload, session)
    assert user.google_id == "google_user_id_123"

@pytest.mark.asyncio
async def test_get_current_user_not_found(session):
    """Test user not found in database"""
    payload = {"sub": "nonexistent_user"}
    with pytest.raises(HTTPException) as exc:
        await get_current_user(payload, session)
    assert exc.value.status_code == 404
```

---

## Troubleshooting

### "Not authenticated" Error

**Symptoms**:
- API returns 401 Unauthorized
- Browser console shows "Invalid token"

**Causes & Solutions**:
1. **Missing idToken in session**:
   - Check NextAuth callback is returning `idToken`
   - Verify `session.idToken = token.idToken` in session callback

2. **Expired token**:
   - NextAuth should auto-refresh
   - Check `refreshAccessToken()` function
   - Verify `GOOGLE_CLIENT_SECRET` is correct

3. **Invalid Google Client ID**:
   - Backend `GOOGLE_CLIENT_ID` must match frontend
   - Check `.env` files on both sides

4. **CORS blocking cookies**:
   - Ensure `credentials: 'include'` in fetch
   - Verify `allow_credentials=True` in FastAPI CORS

### Token Refresh Loops

**Symptoms**:
- Constant redirects to `/login`
- `session.error = 'RefreshAccessTokenError'`

**Solutions**:
1. **Google refresh token expired**:
   - User must re-authenticate (expected after ~7 days)

2. **Invalid refresh_token**:
   - Check `authorization.params.access_type: "offline"` in NextAuth config
   - Ensure `prompt: "consent"` to get refresh_token

### Backend Returns 404 "User not found"

**Cause**: Google ID in token doesn't match database

**Solution**:
1. Check user exists:
   ```sql
   SELECT * FROM users WHERE google_id = 'sub_from_token';
   ```

2. Create user if missing (first-time login):
   ```python
   # Should be handled by signup flow
   user = User(
       google_id=payload["sub"],
       email=payload["email"],
       name=payload["name"]
   )
   session.add(user)
   await session.commit()
   ```

---

## Security Considerations

1. **Never log idToken in production** - Contains sensitive user data
2. **Keep NEXTAUTH_SECRET private** - Used to sign JWT sessions
3. **Use HTTPS in production** - Prevent token interception
4. **Rotate NEXTAUTH_SECRET periodically** - Invalidates all sessions
5. **Monitor failed authentication attempts** - Detect suspicious activity
6. **Set short token expiration** - Reduce impact of token theft (default: 1 hour)

---

## References

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google ID Token Verification](https://developers.google.com/identity/sign-in/web/backend-auth)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/) - Decode and inspect JWTs
