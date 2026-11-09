import { useId } from 'react';
import { InlineNotice } from '@/components/feedback';
import { Button, Field, Input } from '@/components/ui';
import { usePasswordChangeForm } from './PasswordChangeForm.module';

export function PasswordChangeForm({ email }: { email: string }) {
  const id = useId();
  const { currentPassword, setCurrentPassword, newPassword, setNewPassword, pending, notice, submit } = usePasswordChangeForm();

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-heading`} aria-busy={pending}
      className="flex flex-col gap-3 rounded-card bg-surface-card p-4">
      <h2 id={`${id}-heading`} className="eyebrow">Password</h2>
      <input hidden readOnly name="username" autoComplete="username" value={email} />
      <Field label="Current password" htmlFor={`${id}-current`}>
        <Input id={`${id}-current`} name="currentPassword" type="password" autoComplete="current-password"
          required maxLength={128} disabled={pending} value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)} />
      </Field>
      <Field label="New password" htmlFor={`${id}-new`}>
        <Input id={`${id}-new`} name="newPassword" type="password" autoComplete="new-password"
          aria-describedby={`${id}-requirements`} required minLength={8} maxLength={128} disabled={pending}
          value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <p id={`${id}-requirements`} className="text-label text-ink-muted">Use 8 to 128 characters.</p>
      </Field>
      <Button type="submit" loading={pending}>Change password</Button>
      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}
    </form>
  );
}
