import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { InlineNotice } from '@/components/feedback';
import { Button } from '@/components/ui';
import { PasswordChangeForm } from './MeTab/PasswordChangeForm';
import { useSignInMethods } from './SignInMethods.module';

export function SignInMethods({ email }: { email: string }) {
  const {
    hasPassword, googleLinked, showActions, unavailable, retryAvailability,
    pending, confirming, setConfirming, notice, start, unlink,
  } = useSignInMethods();

  return (
    <>
      <PasswordChangeForm email={email} hasPassword={hasPassword} />
      {(showActions || googleLinked || unavailable || notice) && (
        <section aria-label="Google sign-in" className="flex flex-col gap-3 rounded-card bg-surface-card p-4">
          <h2 className="eyebrow">Google sign-in</h2>
          <p className="text-body text-ink">{googleLinked ? 'Google is linked.' : 'Google is not linked.'}</p>
          {showActions && !googleLinked && (
            <Button type="button" loading={pending === 'link'} disabled={pending !== null} onClick={() => void start()}>Link Google</Button>
          )}
          {showActions && googleLinked && hasPassword && (
            <Button type="button" variant="secondary" loading={pending === 'unlink'} disabled={pending !== null} onClick={() => setConfirming(true)}>
              Unlink Google
            </Button>
          )}
          {googleLinked && !hasPassword && (
            <p className="text-label text-ink-muted">Add a password before unlinking Google so you can still sign in.</p>
          )}
          {unavailable && (
            <>
              <InlineNotice tone="error">Google sign-in status could not be checked.</InlineNotice>
              <Button type="button" variant="secondary" onClick={retryAvailability}>Check again</Button>
            </>
          )}
          {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}
        </section>
      )}
      <ConfirmDialog
        open={confirming && showActions && googleLinked && hasPassword}
        title="Unlink Google?"
        description="Other sessions signed in with Google will be signed out. This session and your password sessions will stay signed in."
        confirmLabel="Unlink Google"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void unlink()}
      />
    </>
  );
}
