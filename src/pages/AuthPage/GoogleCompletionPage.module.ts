import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeGoogleSignIn, retryGoogleSession } from '@/features/auth/auth';
import { takeGoogleCompletion, type GooglePurpose } from '@/features/auth/google-return';
import { ApiError } from '@/lib/api';

const restart = 'Google sign-in expired or changed. Start again.';

function messageFor(error: unknown, purpose: GooglePurpose) {
  if (error instanceof ApiError && error.code === 'SESSION_CONFIRMATION_FAILED') {
    return { message: error.message, to: null, label: 'Retry session check' };
  }
  if (purpose === 'link') {
    let message = error instanceof Error ? error.message : 'Google linking could not be verified. Start again from Profile.';
    if (error instanceof ApiError && error.status === 401) {
      return { message: 'Sign in again, then restart Google linking from Profile.', to: '/signin', label: 'Go to sign in' };
    }
    if (error instanceof ApiError && error.code === 'GOOGLE_FLOW_INVALID') {
      message = 'Google linking expired or your session changed. Start again from Profile.';
    }
    return { message, to: '/profile', label: 'Back to Profile' };
  }
  if (error instanceof ApiError) {
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
  const purpose = useRef<GooglePurpose>('sign_in');
  const [error, setError] = useState<ReturnType<typeof messageFor>>();
  const [recovery, setRecovery] = useState(0);

  useEffect(() => {
    if (!request.current) {
      const completion = takeGoogleCompletion();
      if (completion) {
        purpose.current = completion.purpose;
        request.current = completeGoogleSignIn(completion.completionId, completion.purpose);
      } else {
        request.current = Promise.reject(new Error(restart));
      }
    }
    let active = true;
    void request.current.then(() => {
      if (active) navigate(purpose.current === 'link' ? '/profile' : '/dashboard', { replace: true });
    }, (cause: unknown) => {
      if (active) setError(messageFor(cause, purpose.current));
    });
    return () => { active = false; };
  }, [navigate, recovery]);

  const retry = () => {
    request.current = retryGoogleSession(purpose.current);
    setError(undefined);
    setRecovery((attempt) => attempt + 1);
  };

  return { error, retry, linking: purpose.current === 'link' };
}
