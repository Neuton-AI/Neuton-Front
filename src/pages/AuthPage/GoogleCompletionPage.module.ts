import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeGoogleSignIn, retryGoogleSession } from '@/features/auth/auth';
import { takeGoogleCompletionId } from '@/features/auth/google-return';
import { ApiError } from '@/lib/api';

const restart = 'Google sign-in expired or changed. Start again.';

function messageFor(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'SESSION_CONFIRMATION_FAILED') {
      return { message: error.message, to: null, label: 'Retry session check' };
    }
    if (error.code === 'GOOGLE_EMAIL_REQUIRED') {
      return { message: 'Google did not provide a verified email. Create an account with a password.', to: '/signup', label: 'Create an account' };
    }
    if (error.code === 'GOOGLE_EMAIL_IN_USE') {
      return { message: 'Sign in with your existing method, then link Google in Profile.', to: '/signin', label: 'Go to sign in' };
    }
  }
  const message = error instanceof Error ? error.message : restart;
  return { message, to: '/signin', label: 'Back to sign in' };
}

export function useGoogleCompletionPage() {
  const navigate = useNavigate();
  const request = useRef<Promise<void>>();
  const [error, setError] = useState<ReturnType<typeof messageFor>>();
  const [recovery, setRecovery] = useState(0);

  useEffect(() => {
    if (!request.current) {
      const completionId = takeGoogleCompletionId();
      request.current = completionId ? completeGoogleSignIn(completionId) : Promise.reject(new Error(restart));
    }
    let active = true;
    void request.current.then(() => {
      if (active) navigate('/dashboard', { replace: true });
    }, (cause: unknown) => {
      if (active) setError(messageFor(cause));
    });
    return () => { active = false; };
  }, [navigate, recovery]);

  const retry = () => {
    request.current = retryGoogleSession();
    setError(undefined);
    setRecovery((attempt) => attempt + 1);
  };

  return { error, retry };
}
