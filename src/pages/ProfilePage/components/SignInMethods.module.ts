import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { googleSignInAvailable, startGoogleSignIn, unlinkGoogle, useAuth } from '@/features/auth/auth';

function callbackMessage(outcome: string | null) {
  switch (outcome) {
    case 'canceled': return 'Google linking was canceled. You can try again.';
    case 'retry': return 'Google linking could not be verified. Start again.';
    case 'unavailable': return 'Google linking is temporarily unavailable. Try again later.';
    default: return null;
  }
}

export function useSignInMethods() {
  const { session } = useAuth();
  const hasPassword = session?.hasPassword !== false;
  const googleLinked = session?.googleLinked === true;
  const hasGoogleStatus = typeof session?.googleLinked === 'boolean';
  const [params] = useSearchParams();
  const [availability, setAvailability] = useState<'checking' | 'enabled' | 'disabled' | 'unavailable'>('checking');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [pending, setPending] = useState<'link' | 'unlink' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(() => {
    const text = callbackMessage(params.get('google'));
    return text ? { tone: 'error', text } : null;
  });
  const linkRequest = useRef<AbortController>();

  useEffect(() => {
    if (!hasGoogleStatus) return;
    let active = true;
    const check = () => {
      void googleSignInAvailable().then((available) => {
        if (active) setAvailability(available ? 'enabled' : 'disabled');
      }).catch(() => {
        if (active) setAvailability('unavailable');
      });
    };
    const returned = (event: PageTransitionEvent) => {
      if (event.persisted && linkRequest.current) {
        linkRequest.current.abort();
        linkRequest.current = undefined;
        setPending(null);
      }
    };
    check();
    window.addEventListener('pageshow', returned);
    window.addEventListener('online', check);
    return () => {
      active = false;
      linkRequest.current?.abort();
      window.removeEventListener('pageshow', returned);
      window.removeEventListener('online', check);
    };
  }, [hasGoogleStatus, statusAttempt]);

  function retryAvailability() {
    setAvailability('checking');
    setStatusAttempt((attempt) => attempt + 1);
  }

  async function start() {
    if (pending) return;
    const controller = new AbortController();
    linkRequest.current = controller;
    setPending('link');
    setNotice(null);
    try {
      await startGoogleSignIn(controller.signal, 'link');
    } catch (error) {
      if (controller.signal.aborted) return;
      linkRequest.current = undefined;
      setPending(null);
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not start Google linking. Try again.' });
    }
  }

  async function unlink() {
    if (pending) return;
    setConfirming(false);
    setPending('unlink');
    setNotice(null);
    try {
      await unlinkGoogle();
      setNotice({ tone: 'success', text: 'Google unlinked.' });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not unlink Google. Try again.' });
    } finally {
      setPending(null);
    }
  }

  return {
    hasPassword, googleLinked, showActions: availability === 'enabled' && hasGoogleStatus,
    unavailable: availability === 'unavailable',
    retryAvailability, pending, confirming, setConfirming, notice, start, unlink,
  };
}
