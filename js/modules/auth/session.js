// Session lifecycle and auth event wiring extracted from App.js

export function initializeAuthSession({ supabase, setUser, setLoading, setShowPasswordReset, setResetError }) {
  // Avoid churn from duplicate SIGNED_IN / INITIAL_SESSION events with same user id.
  const applySessionUser = (sessionUser) => {
    setUser((prev) => {
      const next = sessionUser ?? null;
      if (prev?.id === next?.id) return prev;
      return next;
    });
  };

  // Check for recovery token in URL query params (new format)
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type');
  const tokenHash = urlParams.get('token_hash');
  if (type === 'recovery' && tokenHash) {
    // Verify the token with Supabase
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
      if (error) {
        console.error('Token verification failed:', error);
        setResetError('Password reset link is invalid or expired. Please request a new one.');
        setLoading(false);
      } else {
        setShowPasswordReset(true);
        setLoading(false);
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
    return () => {};
  }

  // Check for recovery token in URL hash (old format)
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) {
    setShowPasswordReset(true);
    setLoading(false);
    return () => {};
  }

  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.warn('Session error, redirecting to login:', error.message);
      setUser(null);
    } else {
      applySessionUser(session?.user);
    }
    setLoading(false);
  });

  // Monotonic signout generation token to avoid short logout/signin races.
  if (
    typeof window.__authSignoutGeneration !== 'number' ||
    !Number.isFinite(window.__authSignoutGeneration)
  ) {
    window.__authSignoutGeneration = 0;
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    if (event === 'PASSWORD_RECOVERY') {
      setShowPasswordReset(true);
    } else if (event === 'TOKEN_REFRESHED' && !session) {
      // Token refresh failed - session expired
      console.warn('Token refresh failed, session expired');
      setUser(null);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      setUser(null);
      // Advance generation and keep a short compatibility guard.
      window.__authSignoutGeneration = (window.__authSignoutGeneration || 0) + 1;
      window._justSignedOut = true;
      const signedOutGeneration = window.__authSignoutGeneration;
      window.__justSignedOutGeneration = signedOutGeneration;
      setTimeout(() => {
        // Clear only if no newer signout has happened.
        if (window.__justSignedOutGeneration === signedOutGeneration) {
          window._justSignedOut = false;
        }
      }, 2000);
    } else if (event === 'SIGNED_IN') {
      // Only allow explicit sign-in, not from cached session after logout
      if (
        window._justSignedOut &&
        window.__justSignedOutGeneration === (window.__authSignoutGeneration || 0)
      ) {
        console.log('Ignoring SIGNED_IN event right after logout');
        return;
      }
      applySessionUser(session?.user);
    } else if (event === 'INITIAL_SESSION') {
      // Skip initial session if we just logged out (prevents race condition)
      if (
        window._justSignedOut &&
        window.__justSignedOutGeneration === (window.__authSignoutGeneration || 0)
      ) {
        console.log('Ignoring INITIAL_SESSION after logout');
        return;
      }
      applySessionUser(session?.user);
    } else {
      applySessionUser(session?.user);
    }
  });

  return () => subscription.unsubscribe();
}
