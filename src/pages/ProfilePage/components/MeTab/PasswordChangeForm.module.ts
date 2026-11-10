import { useState, type FormEvent } from 'react';
import { addPassword, changePassword } from '@/features/auth/auth';
import { ApiError } from '@/lib/api';

export function usePasswordChangeForm(hasPassword: boolean) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (hasPassword && (currentPassword.length === 0 || currentPassword.length > 128)) {
      setNotice({ tone: 'error', text: 'Enter your current password.' });
      return;
    }
    if (newPassword.length < 10 || newPassword.length > 128) {
      setNotice({ tone: 'error', text: 'Use 10 to 128 characters for your new password.' });
      return;
    }
    setPending(true);
    setNotice(undefined);

    try {
      if (hasPassword) {
        const result = await changePassword({ currentPassword, newPassword });
        setNotice(result === 'changed'
          ? { tone: 'success', text: 'Password changed.' }
          : { tone: 'error', text: 'Password change could not be confirmed.' });
      } else {
        await addPassword(newPassword);
        setNotice({ tone: 'success', text: 'Password added. You can sign in with your Neuton email and password.' });
      }
      setNewPassword('');
    } catch (error) {
      let text = 'Password change is temporarily unavailable. Try again later.';
      if (error instanceof ApiError && error.status === 429) {
        text = 'Too many attempts. Wait a minute and try again.';
      } else if (!hasPassword || (error instanceof ApiError && error.code === 'SIGN_IN_METHOD_BUSY')) {
        text = error instanceof Error ? error.message : 'Could not add a password. Try again.';
        setNewPassword('');
      } else if (error instanceof ApiError && error.status === 400 && error.message === 'Current password is incorrect') {
        text = 'Current password is incorrect.';
      }
      setNotice({ tone: 'error', text });
    } finally {
      setCurrentPassword('');
      setPending(false);
    }
  }

  return { currentPassword, setCurrentPassword, newPassword, setNewPassword, pending, notice, submit };
}
