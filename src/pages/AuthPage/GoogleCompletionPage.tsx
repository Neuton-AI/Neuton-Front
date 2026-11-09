import { Link } from 'react-router-dom';
import { FullPageLoader } from '@/components/feedback';
import { Button } from '@/components/ui';
import { useGoogleCompletionPage } from './GoogleCompletionPage.module';

export function GoogleCompletionPage() {
  const { error, retry } = useGoogleCompletionPage();
  if (!error) return <div role="status"><FullPageLoader label="Finishing Google sign-in" /></div>;
  return (
    <main className="shell flex flex-col justify-center gap-4 px-6 pb-10">
      <h1 className="text-heading font-semibold text-ink">Google sign-in</h1>
      <p role="alert" className="rounded-card bg-semantic-error/10 p-3 text-label font-medium text-ink">{error.message}</p>
      {error.to ? (
        <Link className="font-semibold text-brand-primary underline" to={error.to}>{error.label}</Link>
      ) : (
        <Button type="button" onClick={retry}>{error.label}</Button>
      )}
    </main>
  );
}
