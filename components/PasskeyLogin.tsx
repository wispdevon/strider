import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { createPortal } from 'react-dom';

/**
 * WebAuthn passkey login/register component
 * Renders modal via portal to avoid framer-motion transform conflicts with position:fixed
 */
export default function PasskeyLogin() {
  const { authenticated, loading, refreshAuth } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRegister = async () => {
    console.log('[PasskeyLogin] handleRegister started');
    setError('');
    setIsProcessing(true);
    try {
      // Step 1: Get registration options from server (creates user, returns challenge)
      console.log('[PasskeyLogin] Step 1: Requesting registration options from server...');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined }),
      });
      console.log('[PasskeyLogin] Registration options response status:', res.status);
      if (!res.ok) {
        const errData = await res.json();
        console.error('[PasskeyLogin] Registration options request failed:', errData);
        throw new Error(errData.error || 'Failed to start registration');
      }
      const { userId, challengeId, options } = await res.json();
      console.log('[PasskeyLogin] Got registration options:', { userId, challengeId, rpId: options?.rp?.id, rpName: options?.rp?.name });

      // Step 2: Use browser WebAuthn API to create credential
      console.log('[PasskeyLogin] Step 2: Starting browser WebAuthn registration (startRegistration)...');
      const credential = await startRegistration({ optionsJSON: options });
      console.log('[PasskeyLogin] WebAuthn credential created:', { credentialId: credential?.id, type: credential?.type });

      // Step 3: Verify registration on server (creates session)
      console.log('[PasskeyLogin] Step 3: Verifying registration on server...');
      const verifyRes = await fetch('/api/auth/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credential, challengeId }),
      });
      console.log('[PasskeyLogin] Registration verify response status:', verifyRes.status);
      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        console.error('[PasskeyLogin] Registration verification failed:', errData);
        throw new Error(errData.error || 'Verification failed');
      }
      const verifyData = await verifyRes.json();
      console.log('[PasskeyLogin] Registration verified successfully:', verifyData);

      console.log('[PasskeyLogin] Refreshing auth state...');
      await refreshAuth();
      console.log('[PasskeyLogin] Auth state refreshed, closing modal');
      setShowModal(false);
    } catch (err: any) {
      console.error('[PasskeyLogin] Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    console.log('[PasskeyLogin] handleLogin started');
    setError('');
    setIsProcessing(true);
    try {
      // Step 1: Get login challenge from server
      console.log('[PasskeyLogin] Step 1: Requesting login challenge from server...');
      const challengeRes = await fetch('/api/auth/login', { method: 'POST' });
      console.log('[PasskeyLogin] Login challenge response status:', challengeRes.status);
      if (!challengeRes.ok) {
        const errData = await challengeRes.json();
        console.error('[PasskeyLogin] Login challenge request failed:', errData);
        throw new Error(errData.error || 'Failed to start login');
      }
      const { options, challengeId } = await challengeRes.json();
      console.log('[PasskeyLogin] Got login options:', { challengeId, rpId: options?.rpId, allowCredentialsCount: options?.allowCredentials?.length ?? 'none', timeout: options?.timeout });

      // Step 2: Use browser WebAuthn API to get credential assertion
      console.log('[PasskeyLogin] Step 2: Starting browser WebAuthn authentication (startAuthentication)...');
      const credential = await startAuthentication({ optionsJSON: options });
      console.log('[PasskeyLogin] WebAuthn assertion received:', { credentialId: credential?.id, type: credential?.type, hasUserHandle: !!credential?.response?.userHandle });

      // Step 3: Verify login on server (creates session)
      console.log('[PasskeyLogin] Step 3: Verifying login on server...');
      const verifyRes = await fetch('/api/auth/login', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, challengeId }),
      });
      console.log('[PasskeyLogin] Login verify response status:', verifyRes.status);
      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        console.error('[PasskeyLogin] Login verification failed:', errData);
        throw new Error(errData.error || 'Login failed');
      }
      const verifyData = await verifyRes.json();
      console.log('[PasskeyLogin] Login verified successfully:', { verified: verifyData.verified, userId: verifyData.user?.id, userName: verifyData.user?.name });

      console.log('[PasskeyLogin] Refreshing auth state...');
      await refreshAuth();
      console.log('[PasskeyLogin] Auth state refreshed, closing modal');
      setShowModal(false);
    } catch (err: any) {
      console.error('[PasskeyLogin] Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* Trigger button */}
      {!authenticated && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowModal(true); setMode('login'); }}
          className="px-4 py-2 rounded-lg font-medium bg-[var(--accent)] text-white border border-[var(--accent)] shadow-[0_8px_20px_rgba(29,31,35,0.16)] transition-all duration-300 text-sm"
        >
          Sign in with Passkey
        </motion.button>
      )}

      {/* Modal rendered via portal to avoid CSS transform conflicts */}
      {mounted && showModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <span className="text-5xl">{mode === 'register' ? '🔑' : '🔐'}</span>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mt-4">
                  {mode === 'register' ? 'Create Passkey' : 'Sign in with Passkey'}
                </h2>
                <p className="text-[var(--muted)] mt-2">
                  {mode === 'register'
                    ? 'Your device will create a passkey for passwordless authentication'
                    : 'Use your passkey to sign in securely'}
                </p>
              </div>

              {mode === 'register' && (
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40 mb-4"
                />
              )}

              {error && (
                <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
              )}

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={mode === 'register' ? handleRegister : handleLogin}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/90 transition-all disabled:opacity-50"
                >
                  {isProcessing
                    ? 'Processing...'
                    : mode === 'register'
                      ? 'Create Passkey'
                      : 'Sign in'}
                </motion.button>

                <button
                  onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
                  className="text-sm text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                >
                  {mode === 'register'
                    ? 'Already have a passkey? Sign in'
                    : 'New here? Create a passkey'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}