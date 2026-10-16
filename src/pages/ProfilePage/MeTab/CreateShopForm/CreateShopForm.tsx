import { FormFields } from '@/components/FormFields/FormFields';
import { Button } from '@/components/ui';
import { useCreateShopForm } from './CreateShopForm.module';

export function CreateShopForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (name: string) => void;
}) {
  const { handleSubmit, fields, formValues, handleFieldChange, name } = useCreateShopForm({
    busy,
    onSubmit,
  });
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-card bg-surface-card p-4">
      <p className="text-body text-ink-muted">
        You are not a member of any shop yet. Create one to start tracking.
      </p>
      <FormFields fields={fields} values={formValues} onChange={handleFieldChange} />
      <Button
        type="submit"
        variant="primary"
        size="md"
        block
        loading={busy}
        disabled={name.trim().length < 2}
      >
        Create shop
      </Button>
    </form>
  );
}
