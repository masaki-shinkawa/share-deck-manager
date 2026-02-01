/**
 * Unified Authentication Hook
 *
 * This hook provides consistent authentication handling across all client components.
 * It checks for:
 * 1. Authentication status (loading/authenticated/unauthenticated)
 * 2. Valid idToken presence
 * 3. Token refresh errors
 * 4. Automatic redirect to login when needed
 *
 * @example
 * ```tsx
 * const { session, status, isReady, error } = useAuth();
 *
 * if (!isReady) {
 *   return <LoadingScreen />;
 * }
 *
 * if (error) {
 *   return <ErrorScreen message={error} />;
 * }
 *
 * // Use session.idToken for API calls
 * const data = await api.fetch(session.idToken);
 * ```
 */

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export interface UseAuthReturn {
  /** NextAuth session data including idToken */
  session: ReturnType<typeof useSession>['data'];
  /** Authentication status: loading, authenticated, unauthenticated */
  status: ReturnType<typeof useSession>['status'];
  /** True when authentication is complete and idToken is available */
  isReady: boolean;
  /** Error message if authentication failed */
  error: string | null;
  /** Google ID token for API authentication */
  idToken: string | null;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Determine if authentication is ready
  const isReady = status === 'authenticated' && !!session?.idToken;

  // Check for errors
  let error: string | null = null;
  if (status === 'authenticated' && session?.error === 'RefreshAccessTokenError') {
    error = 'セッションの更新に失敗しました。再度ログインしてください。';
  } else if (status === 'authenticated' && !session?.idToken) {
    error = '認証トークンが見つかりません。再度ログインしてください。';
  }

  // Handle redirects
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (error) {
      console.error('Authentication error:', error);
      // Redirect to login after a short delay to show error message
      const timer = setTimeout(() => {
        router.push('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, error, router]);

  return {
    session,
    status,
    isReady,
    error,
    idToken: session?.idToken ?? null,
  };
}
