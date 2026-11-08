import { useState, type FormEvent } from 'react';
import { changePassword } from '@/features/auth/auth';
import { ApiError } from '@/lib/api';

export function usePasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setNotice(undefined);

    try {
      const result = await changePassword({ currentPassword, newPassword });
      setNewPassword('');
      setNotice(result === 'changed'
        ? { tone: 'success', text: 'Password changed.' }
        : { tone: 'error', text: 'Password change could not be confirmed.' });
    } catch (error) {
      let text = 'Password change is temporarily unavailable. Try again later.';
      if (error instanceof ApiError && error.status === 400 && error.message === 'Current password is incorrect') {
        text = 'Current password is incorrect.';
      } else if (error instanceof ApiError && error.status === 429) {
        text = 'Too many attempts. Wait a minute and try again.';
      }
      setNotice({ tone: 'error', text });
    } finally {
      setCurrentPassword('');
      setPending(false);
    }
  }

  return { currentPassword, setCurrentPassword, newPassword, setNewPassword, pending, notice, submit };
}
